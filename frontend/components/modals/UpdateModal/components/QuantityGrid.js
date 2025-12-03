// QuantityGrid - Pivot table grid for quantity updates with freeze panes
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Coins, CircleDollarSign, Calendar,
  ChevronDown, ChevronRight, Building2
} from 'lucide-react';
import QuantityCell from './QuantityCell';

// Asset type icons
const ASSET_ICONS = {
  security: TrendingUp,
  crypto: Coins,
  metal: CircleDollarSign
};

// Asset type colors
const ASSET_COLORS = {
  security: 'text-blue-400 bg-blue-500/10',
  crypto: 'text-orange-400 bg-orange-500/10',
  metal: 'text-yellow-400 bg-yellow-500/10'
};

/**
 * Format date for display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return dateStr;
  }
};

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * QuantityGrid Component
 * Displays a pivot table with freeze panes for row and column headers
 */
const QuantityGrid = ({
  gridMatrix,
  relevantAccounts,
  columnTotals,
  drafts,
  setDraft,
  onAddPosition,
  loading = false,
  showFullPrecision = false
}) => {
  const containerRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Handle scroll synchronization
  const handleScroll = useCallback((e) => {
    setScrollLeft(e.target.scrollLeft);
    setScrollTop(e.target.scrollTop);
  }, []);

  // Toggle row expansion
  const toggleRowExpand = useCallback((rowKey) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }, []);

  // Get draft value for a cell
  const getDraftValue = useCallback((position) => {
    if (!position) return undefined;
    return drafts[position.lotKey]?.quantity;
  }, [drafts]);

  // Fixed column width for row headers
  const ROW_HEADER_WIDTH = 280;
  const CELL_WIDTH = 110;
  const ROW_HEIGHT = 40;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-gray-600 border-t-cyan-500 rounded-full"
        />
      </div>
    );
  }

  if (!gridMatrix?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-lg font-medium">No positions found</p>
        <p className="text-sm text-gray-600 mt-1">
          Adjust filters or add positions to see data
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-gray-900 rounded-lg border border-gray-700">
      {/* Main grid container with freeze panes */}
      <div className="flex flex-1 overflow-hidden">
        {/* Frozen row headers (left side) */}
        <div
          className="flex-shrink-0 bg-gray-900 border-r border-gray-700 z-20"
          style={{ width: ROW_HEADER_WIDTH }}
        >
          {/* Corner cell (frozen both ways) */}
          <div
            className="sticky top-0 bg-gray-800 border-b border-gray-700 z-30 px-3 py-2"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <span>Position</span>
              <span className="text-gray-500">/</span>
              <span>Date</span>
            </div>
          </div>

          {/* Row headers (scrolls vertically with content) */}
          <div
            className="overflow-hidden"
            style={{
              height: `calc(100% - ${ROW_HEIGHT}px)`,
              transform: `translateY(-${scrollTop}px)`
            }}
          >
            {gridMatrix.map((row) => {
              const AssetIcon = ASSET_ICONS[row.assetType] || TrendingUp;
              const colorClass = ASSET_COLORS[row.assetType] || 'text-gray-400 bg-gray-500/10';

              return (
                <div
                  key={row.rowKey}
                  className="flex items-center gap-2 px-3 border-b border-gray-700/50 hover:bg-gray-800/50"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Asset type icon */}
                  <div className={`p-1.5 rounded ${colorClass}`}>
                    <AssetIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* Identifier and date */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {row.identifier}
                      </span>
                      {row.name !== row.identifier && (
                        <span className="text-xs text-gray-500 truncate hidden xl:block">
                          {row.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(row.purchaseDate)}</span>
                    </div>
                  </div>

                  {/* Row total quantity */}
                  <div className="text-right">
                    <div className="text-xs text-gray-400">
                      {row.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Totals row header */}
            <div
              className="flex items-center gap-2 px-3 bg-gray-800/80 border-t-2 border-gray-600 font-semibold"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="text-sm text-gray-300">Totals</span>
            </div>
          </div>
        </div>

        {/* Scrollable data area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          {/* Column headers (frozen horizontally, scrolls with content) */}
          <div
            className="sticky top-0 bg-gray-800 z-10 flex border-b border-gray-700"
            style={{ minWidth: relevantAccounts.length * CELL_WIDTH }}
          >
            {relevantAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex-shrink-0 px-2 py-2 border-r border-gray-700/50 text-center"
                style={{ width: CELL_WIDTH }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-gray-300 truncate w-full" title={acc.name}>
                    {acc.name}
                  </span>
                  <span className="text-xs text-gray-500 truncate w-full flex items-center justify-center gap-1">
                    <Building2 className="w-2.5 h-2.5" />
                    {acc.institution}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Data cells */}
          <div style={{ minWidth: relevantAccounts.length * CELL_WIDTH }}>
            {gridMatrix.map((row) => (
              <div
                key={row.rowKey}
                className="flex border-b border-gray-700/30"
                style={{ height: ROW_HEIGHT }}
              >
                {row.cells.map((cell, idx) => (
                  <div
                    key={cell.accountId}
                    className="flex-shrink-0"
                    style={{ width: CELL_WIDTH }}
                  >
                    <table className="w-full h-full">
                      <tbody>
                        <tr>
                          <QuantityCell
                            position={cell.position}
                            draftValue={getDraftValue(cell.position)}
                            onDraftChange={setDraft}
                            onAddPosition={() => onAddPosition?.(row, cell)}
                            hasPosition={cell.hasPosition}
                            showFullPrecision={showFullPrecision}
                          />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}

            {/* Column totals row */}
            <div
              className="flex bg-gray-800/80 border-t-2 border-gray-600"
              style={{ height: ROW_HEIGHT }}
            >
              {columnTotals.map((total) => (
                <div
                  key={total.accountId}
                  className="flex-shrink-0 flex items-center justify-end px-2 border-r border-gray-700/50 text-sm font-medium text-gray-300"
                  style={{ width: CELL_WIDTH }}
                >
                  {formatCurrency(total.totalValue)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicators */}
      {scrollLeft > 0 && (
        <div className="absolute top-0 bottom-0 left-[280px] w-4 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
};

export default QuantityGrid;
