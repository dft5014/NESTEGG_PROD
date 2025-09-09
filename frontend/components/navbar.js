// components/Navbar.js
import { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import PeriodSummaryChips from '@/components/PeriodSummaryChips';
import { motion } from 'framer-motion';

import { QuickStartButton } from '@/components/QuickStartModal';
import { QuickReconciliationButton } from '@/components/modals/QuickReconciliationModal';
import { QuickEditDeleteButton } from '@/components/modals/QuickEditDeleteModal';

import { AuthContext } from '@/context/AuthContext';

import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useDataStore } from '@/store/DataStore';

import { TrendingUp, TrendingDown } from 'lucide-react';
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

  const { positions, loading: positionsLoading } = useGroupedPositions();
  const { actions } = useDataStore();

  // Nudge a fetch if we truly have nothing (defensive)
  useEffect(() => {
    if (!positionsLoading && (!positions || positions.length === 0)) {
      actions?.fetchGroupedPositionsData?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsLoading]);


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

// Percent helper: backend may return 0.0123 (1.23%) or 1.23 (1.23%)
// Horizon-aware percent normalizer.
// Accepts number or string (with/without %), parentheses for negatives.
// Heuristic: values in (-1,1) are ambiguous; treat as FRACTION (×100) only when
// small enough to be realistic for that horizon; otherwise treat as already %.
const clamp = (x, cap) => {
  if (!isFinite(x)) return null;
  if (cap == null) return x;
  return Math.max(-cap, Math.min(cap, x));
};

const parseMaybePercentString = (raw) => {
  if (raw == null) return { num: null, hadPercent: false };
  if (typeof raw === 'number') return { num: raw, hadPercent: false };

  // string
  let s = String(raw).trim();
  const hadPercent = s.includes('%');
  const isParenNeg = /^\(.*\)$/.test(s);
  s = s.replace(/[,%\s()]/g, ''); // strip %, commas, spaces, parentheses
  const num = parseFloat(s);
  if (!isFinite(num)) return { num: null, hadPercent: hadPercent };
  const val = isParenNeg ? -Math.abs(num) : num;
  return { num: val, hadPercent };
};

// bounds represent "reasonable" max % magnitudes, used for interpreting
// ambiguous sub-1 values as fraction vs already-percent.
const HORIZON_BOUNDS = {
  '1d': 30,    // ~±30% daily bound
  '1w': 60,    // ~±60% weekly bound
  'ytd': 400,  // broader YTD swings
  'total': 2000,
  'generic': 200,
};

const normalizePct = (raw, horizon = 'generic') => {
  const { num, hadPercent } = parseMaybePercentString(raw);
  if (num == null) return null;

  // If the original text had a '%' sign, treat as percent already.
  if (hadPercent) return clamp(num, HORIZON_BOUNDS[horizon]);

  const abs = Math.abs(num);
  const cap = HORIZON_BOUNDS[horizon] ?? HORIZON_BOUNDS.generic;

  // If abs > 1, it's almost certainly already a percent value (e.g., 1.23 => 1.23%).
  if (abs > 1) return clamp(num, cap);

  // For values in (-1,1), decide: fraction vs already-percent.
  // If it's larger than the horizon's small threshold (e.g., >0.30 for 1d),
  // it's likely already a percent (0.56 -> 0.56%), NOT 56%.
  const smallThreshold = (cap / 100); // e.g., 30% -> 0.30
  if (abs > smallThreshold) {
    // treat as already percent (0.56 -> 0.56%)
    return clamp(num, cap);
  }

  // Otherwise treat as FRACTION needing ×100 (0.0123 -> 1.23%)
  return clamp(num * 100, cap);
};


  // Map grouped positions for ticker (top 10 by value)
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
      .map(pos => {
          const dayPct  = normalizePct(pos.value_1d_change_pct, '1d');
          const weekPct = normalizePct(pos.value_1w_change_pct, '1w');
          const ytdPct  = normalizePct(pos.value_ytd_change_pct, 'ytd');
          const totPct  = normalizePct(pos.total_gain_loss_pct, 'total');

        return {
          symbol: pos.identifier,
          name: pos.name,
          value: pos.total_current_value,
          price: pos.latest_price_per_unit,
          dayChangePercent: dayPct,
          weekChangePercent: weekPct,
          ytdChangePercent: ytdPct,
          totalGainLossPercent: totPct,
          totalGainLossAmt: typeof pos.total_gain_loss_amt === 'number' ? pos.total_gain_loss_amt : null,
          isUp1d: typeof dayPct === 'number' ? dayPct >= 0 : null,
          isUp1w: typeof weekPct === 'number' ? weekPct >= 0 : null,
          isUpYtd: typeof ytdPct === 'number' ? ytdPct >= 0 : null,
          isUpTotal: typeof totPct === 'number' ? totPct >= 0 : null,
        };
      });
  }, [positions]);


  const hasPositions = userStocks.length > 0;
  const isLoading = positionsLoading;
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

            {/* 1D change */}
            <div className="flex items-center gap-1 text-sm">
              <span className="text-xs text-gray-500">1D:</span>
              <span
                className={`flex items-center ${
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
                  return (typeof pct === 'number') ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—';
                })()}
              </span>
            </div>

            {/* 1W / YTD / Gain-Loss (only for user positions) */}
            {hasPositions && (
              <>
                <div className="hidden md:flex items-center gap-1 text-sm">
                  <span className="text-xs text-gray-500">1W:</span>
                  <span
                    className={`flex items-center ${stock.isUp1w ? 'text-green-400' : 'text-red-400'}`}
                    title="1W change"
                  >
                    {stock.isUp1w ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {typeof stock.weekChangePercent === 'number'
                      ? `${stock.weekChangePercent >= 0 ? '+' : ''}${stock.weekChangePercent.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>

                <div className="hidden lg:flex items-center gap-1 text-sm">
                  <span className="text-xs text-gray-500">YTD:</span>
                  <span
                    className={`flex items-center ${stock.isUpYtd ? 'text-green-400' : 'text-red-400'}`}
                    title="YTD change"
                  >
                    {stock.isUpYtd ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {typeof stock.ytdChangePercent === 'number'
                      ? `${stock.ytdChangePercent >= 0 ? '+' : ''}${stock.ytdChangePercent.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>

                <div className="hidden xl:flex items-center gap-1 text-sm">
                  <span className="text-xs text-gray-500">Gain/Loss:</span>
                  <span
                    className={`flex items-center ${
                      stock.isUpTotal == null ? 'text-gray-400' : (stock.isUpTotal ? 'text-green-400' : 'text-red-400')
                    }`}
                    title="Total Gain/Loss"
                  >
                    {stock.isUpTotal == null ? null : (stock.isUpTotal ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />)}
                    {stock.totalGainLossAmt != null ? `${stock.totalGainLossAmt >= 0 ? '+' : ''}${formatCurrency(Math.abs(stock.totalGainLossAmt)).replace('$','')}` : '—'}
                    <span className="text-gray-500 mx-1">/</span>
                    {typeof stock.totalGainLossPercent === 'number'
                      ? `${stock.totalGainLossPercent >= 0 ? '+' : ''}${stock.totalGainLossPercent.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              </>
            )}

          </div>
        ))}
      </div>

      {/* Gradient masks */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-gray-950 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-gray-950 to-transparent" />
    </div>
  );
};

// ---------------------- Navbar ----------------------
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  

  // Toggle scrolled with rAF throttling
  useRafScroll(() => {
    setScrolled(window.scrollY > 10);
  });

  return (
    <>
      {/* Fixed header block: nav + ticker */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="navigation"
          aria-label="Primary"
          className={`transition-colors duration-300 ${
            scrolled
              ? 'bg-gray-900/95 backdrop-blur-md shadow-lg'
              : 'bg-gradient-to-r from-gray-900 via-gray-850 to-blue-900'
          }`}
          style={{ transform: 'none' }}
        >
        {/* Top bar (64px) */}
        <div className="h-16 px-4 flex items-center justify-between">
          {/* Use explicit column sizes so center stays centered and right never collapses */}
          <div className="grid grid-cols-[1fr_auto_1fr] w-full items-center">
            {/* Left spacer */}
            <div />

            {/* Center: Quick Actions */}
            <div className="justify-self-center">
              <div className="flex items-center gap-2 md:-ml-6">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <QuickStartButton />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}>
                  <QuickEditDeleteButton />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <QuickReconciliationButton />
                </motion.div>
              </div>
            </div>

            {/* Right: Period chips — prevent shrink & keep a minimum width */}
            <div className="justify-self-end shrink-0">
              <PeriodSummaryChips className="min-w-[290px] sm:min-w-[340px] whitespace-nowrap" />
            </div>
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