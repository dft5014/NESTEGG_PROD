# Portfolio.js Code Review

**File:** `frontend/pages/portfolio.js`
**Lines:** 1,293
**Review Date:** 2025-11-23

---

## 🔴 Critical Issues

### 1. **Incorrect Historical Cost Basis (Line 279)**
```javascript
costBasis: summary?.totalCostBasis || 0,
```
**Problem:** Uses the *current* cost basis for all historical data points. Cost basis should vary over time.
**Impact:** The "Asset Value & Cost Basis" chart shows incorrect historical cost basis.
**Fix:** Use `d.totalCostBasis` or `d.costBasis` from the trends data if available.

### 2. **Percentage Conversion Inconsistency (Lines 494, 520)**
```javascript
<Delta value={periodChanges?.['1d']?.netWorthPercent} className="mt-1" />
```
**Problem:** `periodChanges` returns percentages as whole numbers (e.g., 5.2 for 5.2%), but `Delta` component multiplies by 100 again, showing "520%".
**Impact:** All performance KPI cards show incorrect percentage changes (100x too large).
**Fix:** Apply `toFrac()` conversion or divide by 100 before passing to `Delta`.

### 3. **Missing Mobile Timeframe Selector (Line 479)**
```javascript
<div className="hidden sm:block"><TimeframeSelector selected={timeframe} onChange={setTimeframe} /></div>
```
**Problem:** Timeframe selector completely hidden on mobile with no alternative.
**Impact:** Mobile users cannot change chart timeframes.
**Fix:** Show a dropdown or compact version on mobile.

### 4. **Redundant Grid Container (Line 860)**
```javascript
<div className="lg:col-span-4 space-y-6">
  <NetWorthWidget ... />
```
**Problem:** This div is already inside `lg:col-span-4`, creating nested grid issues.
**Impact:** Layout breaks on some screen sizes.
**Fix:** Remove the extra wrapper div.

---

## 🟡 High Priority Issues

### 5. **Sector Allocation Data Unused (Lines 340-346)**
```javascript
const sectorAllocationData = useMemo(() => { ... }, [rawSectorAllocation]);
```
**Problem:** Computed but never rendered anywhere in the UI.
**Impact:** Wasted computation; users miss valuable sector breakdown.
**Fix:** Add a Sector Allocation section or remove the computation.

### 6. **Fragile Date Parsing (Lines 306-309)**
```javascript
const [y, m, d] = (dateStr || '').split('-').map((n) => parseInt(n));
const dt = new Date(y, (m || 1) - 1, d || 1);
```
**Problem:** Manual date parsing is error-prone; doesn't handle invalid formats.
**Impact:** Cash flow chart may crash or show incorrect dates.
**Fix:** Use `new Date(dateStr)` or a date library like date-fns.

### 7. **Reference Line Uses Wrong Baseline (Lines 611, 669)**
```javascript
<ReferenceLine y={slicedChart?.[0]?.value || 0} stroke="#334155" strokeDasharray="3 3" />
```
**Problem:** Uses first value in *visible range*, not the true starting baseline.
**Impact:** Reference line moves when changing timeframes, which is confusing.
**Fix:** Use the first value from the *full* dataset or remove reference line.

### 8. **Hardcoded Top 5 Limits (Lines 354, 359)**
```javascript
.slice(0, 5)
```
**Problem:** Arbitrarily limits data without user control.
**Impact:** Users cannot see full institution/position lists.
**Fix:** Add "Show More" button or make limit configurable.

### 9. **Hacky Stacked Bar Layout (Line 1154)**
```javascript
style={{ width: `${liabsPct}%`, background: '...', marginTop: '-0.75rem' }}
```
**Problem:** Negative margin to overlay bars is brittle.
**Impact:** May break with different font sizes or zoom levels.
**Fix:** Use proper CSS Flexbox or Grid for stacked layout.

---

## 🟠 Medium Priority Issues

### 10. **Duplicate Performance Rail Logic (Lines 504-589)**
**Problem:** Nearly identical code for Net Worth rail and Secondary Metric rail.
**Impact:** Maintenance burden; changes need to be duplicated.
**Fix:** Extract into reusable `PerformanceRail` component.

### 11. **Inconsistent Null Handling**
- Lines 53-62: Uses `value === null || value === undefined`
- Lines 64-68: Uses `v === null || v === undefined || isNaN(v)`
- Lines 92-98: Uses `rows?.length` and `??` operator

**Problem:** Three different null-checking patterns in utility functions.
**Impact:** Inconsistent behavior; harder to maintain.
**Fix:** Standardize on optional chaining and nullish coalescing (`?.` and `??`).

### 12. **Magic Numbers Without Constants**
- Line 82: `slice(-2)` for 1-day data
- Line 199: `h-10 w-28` for sparkline dimensions
- Line 597: `h-72` for chart height
- Line 757: `innerRadius={56} outerRadius={82}`

**Problem:** Unexplained hardcoded values scattered throughout.
**Impact:** Difficult to maintain consistent sizing.
**Fix:** Extract to named constants at top of file.

### 13. **Missing Error Boundaries**
**Problem:** No error boundaries around chart components.
**Impact:** A single chart rendering error crashes entire page.
**Fix:** Wrap chart sections in React Error Boundaries.

### 14. **Accessibility Issues**
- Missing `aria-label` on many buttons
- Charts have no alt text or ARIA descriptions
- Keyboard navigation not fully implemented
- Color-only indicators for positive/negative values

**Impact:** Poor experience for screen reader users and keyboard-only navigation.
**Fix:** Add proper ARIA labels, keyboard handlers, and text alternatives.

### 15. **Performance: Unnecessary Recalculations**
```javascript
const chartData = useMemo(() => { ... }, [trends?.chartData, summary?.totalCostBasis]);
```
**Problem:** Including `summary?.totalCostBasis` causes recalc even when chart data unchanged.
**Impact:** Unnecessary re-renders on every summary update.
**Fix:** Remove `summary?.totalCostBasis` from dependencies or compute it inside the memo.

---

## 🟢 Low Priority / Code Quality Issues

### 16. **Inconsistent Color Management**
- Some places: `assetColors.securities` (Line 331)
- Other places: `'#4f46e5'` hardcoded (Line 37)
- Other places: Tailwind classes `text-indigo-300`

**Problem:** Three different ways to handle colors.
**Fix:** Centralize all color definitions and use consistently.

### 17. **Component Organization**
- Page component: 1,293 lines
- Multiple sub-components defined at bottom (after main export)
- Utility functions mixed with components

**Problem:** File is too large and poorly organized.
**Fix:** Split into separate files:
  - `portfolio/index.js` (main page)
  - `portfolio/components/` (reusable components)
  - `portfolio/utils.js` (utilities)

### 18. **Incomplete YTD Filtering (Line 85)**
```javascript
if (id === 'ytd') return chartRows; // assume chartData already filtered to YTD elsewhere
```
**Problem:** Comment admits filtering doesn't actually happen.
**Impact:** YTD selector may show wrong data range.
**Fix:** Implement proper YTD filtering (lines 288-294 do this correctly).

### 19. **Unused Imports**
- `RechartsPieChart` imported but could use destructured `PieChart`
- Some icons imported but may not be used

**Fix:** Audit and remove unused imports.

### 20. **Type Safety**
**Problem:** No PropTypes or TypeScript types defined.
**Impact:** Runtime errors from wrong data shapes; no IDE autocomplete.
**Fix:** Add PropTypes or migrate to TypeScript.

### 21. **Date Locale Inconsistency (Lines 275, 309)**
```javascript
date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
```
**Problem:** Hardcoded 'en-US' locale.
**Impact:** International users see American date formats.
**Fix:** Use user's locale or make configurable.

### 22. **Loading State Inconsistency**
- Line 371: Shows spinner when `isLoading && !summary`
- But child components may still try to render with stale data

**Problem:** Partial loading states can show outdated information.
**Fix:** Show loading overlay or skeleton loaders for individual sections.

### 23. **NetWorthWidget Calculation Issue (Lines 1124-1126)**
```javascript
const total = Math.max(assets + Math.max(liabilities, 0), 1);
const assetsPct = Math.min((assets / total) * 100, 100);
const liabsPct = Math.min((Math.max(liabilities,0) / total) * 100, 100);
```
**Problem:** Percentages calculated against `assets + liabilities`, but they should sum to 100% if shown as composition.
**Impact:** Visual bar may not accurately represent composition.
**Fix:** Recalculate based on what the visualization actually represents.

### 24. **Tooltip Component Coupling (Lines 407-456)**
**Problem:** Custom tooltip components defined inside main component, recreated on every render.
**Impact:** Minor performance penalty.
**Fix:** Move outside component or memoize.

### 25. **`computeMixBreakdown` Function Complexity (Lines 1264-1292)**
**Problem:** Complex switch statement with hardcoded category logic.
**Impact:** Hard to maintain; category changes require code updates.
**Fix:** Use configuration object mapping categories to calculation functions.

---

## 📊 Performance Recommendations

1. **Memoize Expensive Calculations:**
   - Lines 328-338: `netWorthMixData`
   - Lines 340-346: `sectorAllocationData`
   - Lines 348-355: `institutionMixData`

   ✅ Already memoized, but verify dependencies are minimal.

2. **Chart Data Optimization:**
   - Consider virtualizing or sampling for very large datasets (>365 points)
   - Add loading skeletons for charts instead of blank space

3. **Reduce Rechart Re-renders:**
   - Memoize tooltip components
   - Use `isAnimationActive={false}` for large datasets

---

## 🔧 Suggested Refactoring

### Extract Reusable Components:
1. `PerformanceRail` (lines 504-589 duplicated logic)
2. `ChartSection` (wrapper for all chart sections)
3. `MetricCard` (used in multiple places)

### Create Utility Module:
```javascript
// utils/formatting.js
export { formatCurrency, formatPct, axisMoney, toFrac };

// utils/chartHelpers.js
export { sliceForPeriod, computeChangeFor, periodWindowDays };
```

### Configuration Objects:
```javascript
const CHART_HEIGHTS = {
  small: 'h-56',
  medium: 'h-72',
  large: 'h-80',
};

const DISPLAY_LIMITS = {
  topPositions: 5,
  topInstitutions: 5,
  topPerformers: 5,
};
```

---

## ✅ What's Done Well

1. **Responsive Design:** Good use of Tailwind responsive classes
2. **Framer Motion:** Smooth animations enhance UX
3. **Data Hooks:** Clean separation of data fetching logic
4. **Loading/Error States:** Properly handled at top level
5. **Memoization:** Most expensive calculations are memoized
6. **Component Reusability:** Good use of small components like `Section`, `Delta`, `Row`
7. **Visual Design:** Clean, modern UI with good color scheme
8. **Chart Variety:** Good mix of chart types (area, line, pie, sparklines)

---

## 🎯 Priority Fix Order

1. **Fix percentage display bug** (Critical #2)
2. **Fix historical cost basis** (Critical #1)
3. **Add mobile timeframe selector** (Critical #3)
4. **Remove redundant grid container** (Critical #4)
5. **Add or remove sector allocation** (High #5)
6. **Fix reference line baseline** (High #7)
7. **Extract duplicate performance rail code** (Medium #10)
8. **Add error boundaries** (Medium #13)
9. **Improve accessibility** (Medium #14)
10. **Code splitting and organization** (Low #17)

---

## 📝 Recommendations Summary

### Immediate Actions:
- Fix percentage conversion bug (affects all KPIs)
- Add mobile UI for timeframe selection
- Fix historical cost basis in charts
- Remove redundant wrapper div

### Short Term:
- Render or remove sector allocation
- Extract duplicate code into components
- Add error boundaries
- Improve date parsing

### Long Term:
- Migrate to TypeScript for type safety
- Split file into smaller modules
- Comprehensive accessibility audit
- Performance profiling and optimization

---

**Overall Assessment:** The code is functional and well-designed visually, but has several data display bugs that should be fixed immediately. The file is too large and would benefit from splitting into smaller modules. Some computed data is unused, and there are accessibility gaps that should be addressed.
