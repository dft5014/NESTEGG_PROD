// components/Navbar.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PeriodSummaryChips from '@/components/PeriodSummaryChips';
import { motion } from 'framer-motion';

import { QuickStartModalV2Button } from '@/components/modals/quickstart';
import { QuickReconciliationButton } from '@/components/modals/QuickReconciliationModal';
import { QuickEditDeleteButton } from '@/components/modals/QuickEditDeleteModal';
import { QuickEditDeleteButton as QuickEditDeleteButton2 } from '@/components/modals/EditDeleteModal';
import { UpdateButtonV2 } from '@/components/modals/UpdateModal';
import { QuickStatementValidationButton } from '@/components/modals/QuickStatementValidationModal';
import { ValidateButton2 } from '@/components/modals/validate';
import { QuickStatementImportButton } from '@/components/modals/AddStatementImportModal';

import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useDataStore } from '@/store/DataStore';

import {
  TrendingUp, TrendingDown,
  HelpCircle, X, ArrowRight, ArrowLeft
} from 'lucide-react';
import { formatCurrency, formatStockPrice } from '@/utils/formatters';

// ---- Layout constants
const NAV_BAR_H = 64;      // 16 * 4px
const TICKER_H  = 32;      // 8  * 4px
const HEADER_TOTAL_H = NAV_BAR_H + TICKER_H; // 96
const SCROLL_SPEED_PX_PER_FRAME = 0.6;       // ~36px/s @ 60fps

// ---- Unified button wrapper styling for navbar action buttons
// Base styling applied to all Quick* buttons for consistent appearance
const NAVBAR_BTN_BASE = [
  // size & shape
  "[&_button]:px-3.5 [&_button]:h-9 [&_button]:rounded-lg",
  // background / border / blur
  "[&_button]:bg-gray-800/70 [&_button]:border [&_button]:border-white/[0.08] [&_button]:backdrop-blur-sm",
  // base shadow
  "[&_button]:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
  // hover: lift + stronger shadow
  "[&_button:hover]:-translate-y-0.5",
  "[&_button:hover]:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
  "[&_button:hover]:border-white/[0.12]",
  "[&_button:hover]:bg-gray-700/80",
  // transitions
  "[&_button]:transition-all [&_button]:duration-200 [&_button]:ease-out",
  // text styling
  "[&_button]:text-gray-200 [&_button]:text-[13px] [&_button]:font-medium",
  // icon base
  "[&_button_svg]:w-4 [&_button_svg]:h-4 [&_button_svg]:transition-colors [&_button_svg]:duration-200",
].join(' ');

// Color accent classes for each button type
const BTN_ACCENT = {
  add: "[&_button_svg]:text-emerald-400 [&_button:hover_svg]:text-emerald-300 [&_button:hover]:border-emerald-500/20",
  edit: "[&_button_svg]:text-blue-400 [&_button:hover_svg]:text-blue-300 [&_button:hover]:border-blue-500/20",
  update: "[&_button_svg]:text-cyan-400 [&_button:hover_svg]:text-cyan-300 [&_button:hover]:border-cyan-500/20",
  reconcile: "[&_button_svg]:text-violet-400 [&_button:hover_svg]:text-violet-300 [&_button:hover]:border-violet-500/20",
  import: "[&_button_svg]:text-amber-400 [&_button:hover_svg]:text-amber-300 [&_button:hover]:border-amber-500/20",
};

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

/* ---------------------- StockTicker ----------------------
   Accepts outerRef so the orientation can spotlight it.
*/
const StockTicker = ({ outerRef }) => {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false); // for a11y feedback
  const contentWidthRef = useRef(0);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const { positions, loading: positionsLoading } = useGroupedPositions();
  const { actions } = useDataStore();

  // Expose container to parent (for coach marks)
  useEffect(() => {
    if (outerRef && 'current' in outerRef) {
      outerRef.current = containerRef.current;
    }
  }, [outerRef]);

  // Defensive fetch if nothing loaded
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

  // Percent parser
  const parsePct = (raw) => {
    if (raw == null) return null;
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    let s = String(raw).trim();
    const isParenNeg = /^\(.*\)$/.test(s);
    s = s.replace(/[,%\s()]/g, '');
    let n = parseFloat(s);
    if (!isFinite(n)) return null;
    if (isParenNeg) n = -Math.abs(n);
    return n;
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
        const dayPct  = parsePct(pos.value_1d_change_pct);
        const weekPct = parsePct(pos.value_1w_change_pct);
        const ytdPct  = parsePct(pos.value_ytd_change_pct);
        const totPct  = parsePct(pos.total_gain_loss_pct);

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

  const shouldAnimate = !prefersReducedMotion.current && !isLoading && items.length > 0;

  // Render list 3x for seamless loop only when animating
  const tickerContent = useMemo(
    () => (shouldAnimate ? [...items, ...items, ...items] : items),
    [items, shouldAnimate]
  );

  // Measure one loop width
  const measure = useCallback(() => {
    if (!trackRef.current || !containerRef.current) return;
    const trackWidth = trackRef.current.scrollWidth;
    const containerWidth = containerRef.current.clientWidth || 0;
    contentWidthRef.current = shouldAnimate && trackWidth > 0 ? trackWidth / 3 : containerWidth;

    // Normalize position after resize/content change
    const single = contentWidthRef.current || 1;
    if (Math.abs(posRef.current) >= single) {
      posRef.current = - (Math.abs(posRef.current) % single);
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${posRef.current}px)`;
      }
    }
  }, [shouldAnimate]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, tickerContent.length]);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      const hidden = document.visibilityState !== 'visible';
      pausedRef.current = hidden || paused;
      if (!pausedRef.current && rafRef.current == null && shouldAnimate) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [paused, shouldAnimate]);

  // Animation loop
  const tick = useCallback(() => {
    if (!shouldAnimate) return;
    if (prefersReducedMotion.current || pausedRef.current) { rafRef.current = null; return; }

    posRef.current -= SCROLL_SPEED_PX_PER_FRAME;
    const singleWidth = contentWidthRef.current || 1000;

    if (Math.abs(posRef.current) >= singleWidth) {
      posRef.current += singleWidth; // loop
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${posRef.current}px)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [shouldAnimate]);

  useEffect(() => {
    if (shouldAnimate && !prefersReducedMotion.current && !pausedRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [tick, shouldAnimate]);

  // Hover/focus pause controls
  const pause = useCallback(() => { pausedRef.current = true; setPaused(true); }, []);
  const resume = useCallback(() => {
    pausedRef.current = false; setPaused(false);
    if (shouldAnimate && !prefersReducedMotion.current && !rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [shouldAnimate, tick]);

  const onKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      pausedRef.current ? resume() : pause();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-8 bg-gray-950 border-t border-gray-800 overflow-hidden z-40"
      role="region"
      aria-label="Market ticker"
      aria-live="off"
      aria-describedby="ticker-instructions"
      tabIndex={0}
      onFocus={pause}
      onBlur={resume}
      onKeyDown={onKeyDown}
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <span id="ticker-instructions" className="sr-only">
        This ticker scrolls automatically. Focus to pause. Press Space or Enter to pause or resume.
      </span>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
          <div className="text-gray-400 text-sm">Loading portfolio data…</div>
        </div>
      )}

      <div
        ref={trackRef}
        className={`absolute inset-y-0 left-0 flex items-center whitespace-nowrap ${shouldAnimate ? 'will-change-transform' : ''}`}
        style={{ transform: 'translateX(0px)' }}
      >
        {tickerContent.map((stock, index) => (
          <div
            key={`${stock.symbol}-${index}`}
            className="inline-flex items-center gap-4 px-6 border-r border-gray-800"
          >
            <div>
              <span className="font-semibold text-gray-300">{stock.symbol}</span>
              {stock.name && (
                <span className="text-xs text-gray-500 ml-1">({String(stock.name).slice(0, 15)}…)</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Price:</span>
              <span className="text-gray-300">
                {stock.price !== null && stock.price !== undefined ? formatStockPrice(stock.price) : 'N/A'}
              </span>
            </div>

            {typeof stock.value === 'number' && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Value:</span>
                <span className="text-gray-300">{formatCurrency(stock.value)}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-sm">
              <span className="text-xs text-gray-500">1D:</span>
              <span
                className={`flex items-center ${
                  (hasPositions ? stock.isUp1d : stock.isUp) ? 'text-green-400' : 'text-red-400'
                }`}
                title="1D change"
              >
                {(hasPositions ? stock.isUp1d : stock.isUp)
                  ? <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" />
                  : <TrendingDown className="w-3 h-3 mr-1" aria-hidden="true" />
                }
                {(() => {
                  const pct = hasPositions ? stock.dayChangePercent : stock.changePercent;
                  return (typeof pct === 'number') ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—';
                })()}
              </span>
            </div>

            {hasPositions && (
              <>
                <div className="hidden md:flex items-center gap-1 text-sm">
                  <span className="text-xs text-gray-500">1W:</span>
                  <span
                    className={`flex items-center ${stock.isUp1w ? 'text-green-400' : 'text-red-400'}`}
                    title="1W change"
                  >
                    {stock.isUp1w ? <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" /> : <TrendingDown className="w-3 h-3 mr-1" aria-hidden="true" />}
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
                    {stock.isUpYtd ? <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" /> : <TrendingDown className="w-3 h-3 mr-1" aria-hidden="true" />}
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
                    {stock.isUpTotal == null ? null : (stock.isUpTotal ? <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" /> : <TrendingDown className="w-3 h-3 mr-1" aria-hidden="true" />)}
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

/* ---------------------- Orientation (Coach Marks) ---------------------- */
function useCoachMarks(targetRefs, enabled, onClose) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  // Compute rect of current step
  const measure = useCallback(() => {
    if (!enabled) return;
    const el = targetRefs[step]?.current;
    if (!el) { setRect(null); return; }
    const inner = el.querySelector('[data-tour-id],button,[role="button"]') || el;
    const r = (inner.getBoundingClientRect && inner.getBoundingClientRect()) || null;
    setRect(r ? { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height } : null);
  }, [enabled, step, targetRefs]);

  useEffect(() => {
    if (!enabled) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [enabled, measure]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setStep(s => Math.min(s + 1, targetRefs.length - 1));
      if (e.key === 'ArrowLeft') setStep(s => Math.max(s - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, onClose, targetRefs.length]);

  return { step, setStep, rect };
}

function CoachOverlay({ open, step, rect, steps, onNext, onPrev, onExit }) {
  if (!open) return null;

  const s = steps[step] || {};
  const isFinal = step === steps.length - 1;
  const padding = 8;

  const box = rect && !isFinal ? {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  } : null;

  // Default card position (below highlight)
  let cardTop = box ? Math.min(box.top + box.height + 10, window.scrollY + window.innerHeight - 220) : '50%';
  let cardLeft = box ? Math.min(box.left, window.scrollX + window.innerWidth - 480) : '50%';
  let cardTransform = box ? 'none' : 'translate(-50%, -50%)';

  // Pin to the right of target when placement === 'right' (e.g., Ticker step),
  // clamped to viewport to avoid sidebar overlap.
  if (box && s.placement === 'right') {
    cardTop = Math.min(Math.max(box.top, window.scrollY + 16), window.scrollY + window.innerHeight - 240);
    cardLeft = Math.min(box.left + box.width + 12, window.scrollX + window.innerWidth - 480);
    cardTransform = 'none';
  }

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Spotlight (skip on final summary) */}
      {box && (
        <div
          className="absolute rounded-xl ring-2 ring-blue-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, pointerEvents: 'none' }}
        />
      )}

      {/* Coach card */}
      <div
        className="absolute max-w-sm w-[92vw] sm:w-[440px] bg-gray-900/95 border border-white/10 rounded-2xl p-4 shadow-xl"
        style={{ top: cardTop, left: cardLeft, transform: cardTransform }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="coach-title" className="text-sm font-semibold text-white">{s.title}</h2>
            <p className="text-xs text-gray-300 mt-1">{s.desc}</p>
            {s.extra && <div className="mt-2 text-xs text-gray-400">{s.extra}</div>}
          </div>
          <button
            onClick={onExit}
            className="p-1 rounded-md hover:bg-white/10 text-gray-300"
            aria-label="Exit orientation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={step === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-gray-800/70 text-gray-200 border border-white/10 disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="text-[11px] text-gray-400">
            Step {step + 1} of {steps.length}
          </div>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isFinal ? "Finish" : "Next"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Navbar ---------------------- */
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  // Orientation state
  const [showTour, setShowTour] = useState(false);

  // Refs to spotlight targets
  const addRef      = useRef(null);
  const editRef     = useRef(null);
  const recRef      = useRef(null);
  const validateRef = useRef(null);
  const summaryRef  = useRef(null);
  const tickerRef   = useRef(null);

  // Keep center behavior on scroll
  useRafScroll(() => setScrolled(window.scrollY > 10));

  // Steps: Add, Edit, Update, Validate, Summary (chips), Ticker (right-pinned card), Final summary
  const steps = useMemo(() => ([
    { title: "Add to NestEgg", desc: "Create accounts, add positions, and track liabilities." },
    { title: "Edit & Delete",  desc: "Update entries quickly—inline edits and clean removals." },
    { title: "Update Manual",  desc: "Refresh non-market items like cash, loans, or other assets." },
    { title: "Validate Accounts", desc: "Reconcile your accounts against statements to ensure accuracy." },
    { title: "Portfolio Summary", desc: "Your key totals and changes for the selected period (top right)." },
    { title: "Live Ticker", desc: "Quick view of top holdings, prices, and 1D/1W/YTD moves.", placement: "right" },
    {
      title: "You're All Set!",
      desc: "You now know the essentials. Here's your quick workflow:",
      extra: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>Add your primary accounts (brokerage, retirement, cash, loans).</li>
            <li>Enter positions or import balances for manual tracking.</li>
            <li>Use Edit to correct mistakes or update values.</li>
            <li>Run Validate periodically to reconcile with statements.</li>
            <li>Monitor your Summary to track portfolio changes over time.</li>
          </ul>
          <div className="mt-3 text-blue-200 text-xs">
            💡 Tip: Use keyboard shortcuts and export features for faster workflows!
          </div>
        </>
      )
    }
  ]), []);

  const { step, setStep, rect } = useCoachMarks(
    [addRef, editRef, recRef, validateRef, summaryRef, tickerRef, { current: null }], // last step is centered card only
    showTour,
    () => setShowTour(false)
  );

  const onExitTour = useCallback(() => setShowTour(false), []);
  const onNextTour = useCallback(() => {
    setStep((s) => {
      if (s >= steps.length - 1) { setShowTour(false); return s; }
      return s + 1;
    });
  }, [setStep, steps.length]);
  const onPrevTour = useCallback(() => setStep((s) => Math.max(0, s - 1)), [setStep]);

  return (
    <>
      {/* Accessible skip link (visible on focus) */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-blue-600 focus:text-white focus:px-3 focus:py-2 focus:rounded-md focus:shadow-md z-[9999]"
      >
        Skip to content
      </a>

      {/* Fixed header: nav + ticker */}
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
            {/* Grid: [left spacer] [center quick actions] [right ? + summary] */}
            <div className="grid grid-cols-[1fr_auto_1fr] w-full items-center">
              {/* Left spacer */}
              <div />

              {/* Center: Quick action buttons */}
              <div className="justify-self-center">
                <div className="flex items-center gap-1.5 md:-ml-6">
                  {/* 1. Add */}
                  <div ref={addRef} className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.add}`}>
                    <QuickStartModalV2Button />
                  </div>

                  {/* 2. Edit */}
                  <div ref={editRef} className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.edit}`}>
                    <QuickEditDeleteButton label="Edit" />
                  </div>

                  {/* 3. Update (Original) */}
                  <div ref={recRef} className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.update}`}>
                    <QuickReconciliationButton label="Update" />
                  </div>

                  {/* 3b. Update V2 (New modular version for testing) */}
                  <div className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.update}`}>
                    <UpdateButtonV2 label="Update V2" />
                  </div>

                  {/* 4. Reconcile (validate) - Original */}
                  <div ref={validateRef} className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.reconcile}`}>
                    <QuickStatementValidationButton label="Reconcile" />
                  </div>

                  {/* 4b. Reconcile V2 - New modular version */}
                  <div className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.reconcile}`}>
                    <ValidateButton2 label="Reconcile V2" />
                  </div>

                  {/* 5. Import Statements */}
                  <div className={`${NAVBAR_BTN_BASE} ${BTN_ACCENT.import}`}>
                    <QuickStatementImportButton label="Import" />
                  </div>
                </div>
              </div>

              {/* Right: "?" then Summary */}
              <div className="justify-self-end shrink-0 flex items-center gap-2">
                {/* Orientation toggle */}
                <button
                  type="button"
                  onClick={() => { setShowTour(v => !v); setStep(0); }}
                  className={[
                    "inline-flex items-center justify-center w-9 h-9 rounded-lg",
                    "bg-gray-800/70 border border-white/[0.08] backdrop-blur-sm",
                    "shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
                    "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
                    "hover:border-white/[0.12] hover:bg-gray-700/80",
                    "transition-all duration-200 ease-out",
                  ].join(' ')}
                  aria-pressed={showTour}
                  title="Orientation"
                >
                  <HelpCircle className="w-4 h-4 text-gray-400" aria-hidden="true" />
                </button>

                {/* Portfolio Summary */}
                <div ref={summaryRef}>
                  <PeriodSummaryChips className="min-w-[290px] sm:min-w-[340px] whitespace-nowrap" />
                </div>
              </div>
            </div>
          </div>

          {/* Ticker (32px) inside the same fixed nav) */}
          <StockTicker outerRef={tickerRef} />
        </motion.nav>
      </div>

      {/* Spacer to push page content below fixed header */}
      <div style={{ height: HEADER_TOTAL_H }} aria-hidden />

      {/* Skip link target */}
      <a id="content" className="sr-only">Main content</a>

      {/* Orientation overlay */}
      <CoachOverlay
        open={showTour}
        step={step}
        rect={rect}
        steps={steps}
        onNext={onNextTour}
        onPrev={onPrevTour}
        onExit={onExitTour}
      />
    </>
  );
};

export default Navbar;
