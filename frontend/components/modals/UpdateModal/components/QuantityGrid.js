// QuantityGrid - Pivot table grid for quantity updates with freeze panes
import React, { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Coins, CircleDollarSign, Calendar,
  Building2, ChevronUp, ChevronDown, ChevronsUpDown
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
 * Sort indicator component
 */
const SortIndicator = ({ column, sortBy, sortDir }) => {
  if (sortBy !== column) {
    return <ChevronsUpDown className="w-3 h-3 text-gray-600" />;
  }
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-cyan-400" />
    : <ChevronDown className="w-3 h-3 text-cyan-400" />;
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
  // New position props
  newPositions = {},
  onNewPositionChange,
  getNewPositionValue,
  // Sorting props
  sortBy = 'identifier',
  sortDir = 'asc',
  onSort,
  // Account column sorting props
  accountSortBy = 'value',
  accountSortDir = 'desc',
  onAccountSort,
  loading = false,
  showFullPrecision = false
}) => {
  const rowHeadersRef = useRef(null);
  const dataContainerRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Sync vertical scroll between row headers and data
  const handleDataScroll = useCallback((e) => {
    setScrollLeft(e.target.scrollLeft);
    if (rowHeadersRef.current) {
      rowHeadersRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  // Get draft value for a cell
  const getDraftValue = useCallback((position) => {
    if (!position) return undefined;
    return drafts[position.lotKey]?.quantity;
  }, [drafts]);

  // Fixed dimensions
  const ROW_HEADER_WIDTH = 280;
  const CELL_WIDTH = 110;
  const ROW_HEIGHT = 40;
  const HEADER_HEIGHT = 40;

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

  const totalDataHeight = gridMatrix.length * ROW_HEIGHT; // Totals row moved to frozen header

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-gray-900 rounded-lg border border-gray-700">
      {/* Main grid container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Frozen row headers column */}
        <div
          className="flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-700"
          style={{ width: ROW_HEADER_WIDTH }}
        >
          {/* Row sort controls (aligns with account sort row on right) */}
          <div
            className="flex-shrink-0 bg-gray-850 border-b border-gray-700 px-2 flex items-center gap-1"
            style={{ height: 28 }}
          >
            <span className="text-xs text-gray-500 mr-1">Sort rows:</span>
            <button
              onClick={() => onSort?.('identifier')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                sortBy === 'identifier'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Sort by ticker"
            >
              <span>Ticker</span>
              {sortBy === 'identifier' && (
                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => onSort?.('purchaseDate')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                sortBy === 'purchaseDate'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Sort by date"
            >
              <span>Date</span>
              {sortBy === 'purchaseDate' && (
                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => onSort?.('totalQuantity')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                sortBy === 'totalQuantity'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Sort by quantity"
            >
              <span>Qty</span>
              {sortBy === 'totalQuantity' && (
                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Column header placeholder (aligns with account headers on right) */}
          <div
            className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-3 flex items-center"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Position / Date</span>
          </div>

          {/* Totals row label (aligns with totals row on right) */}
          <div
            className="flex-shrink-0 bg-gray-800/90 border-b-2 border-emerald-600/30 px-3 flex items-center"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="text-sm font-semibold text-emerald-400">Totals</span>
          </div>

          {/* Row headers - scrollable vertically, synced with data */}
          <div
            ref={rowHeadersRef}
            className="flex-1 overflow-hidden"
            style={{ overflowY: 'hidden' }}
          >
            <div style={{ height: totalDataHeight }}>
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
                    <div className={`flex-shrink-0 p-1.5 rounded ${colorClass}`}>
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
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-400">
                        {row.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable data area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Account sort controls row */}
          <div
            className="flex-shrink-0 bg-gray-850 border-b border-gray-700 px-2 py-1.5 flex items-center gap-1"
            style={{ height: 28 }}
          >
            <span className="text-xs text-gray-500 mr-1">Sort accounts:</span>
            <button
              onClick={() => onAccountSort?.('value')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                accountSortBy === 'value'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Sort accounts by balance"
            >
              <span>Value</span>
              {accountSortBy === 'value' && (
                accountSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => onAccountSort?.('name')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                accountSortBy === 'name'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Sort accounts alphabetically"
            >
              <span>A-Z</span>
              {accountSortBy === 'name' && (
                accountSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => onAccountSort?.('institution')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                accountSortBy === 'institution'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Sort accounts by institution"
            >
              <span>Institution</span>
              {accountSortBy === 'institution' && (
                accountSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Column headers (frozen row, scrolls horizontally) */}
          <div
            className="flex-shrink-0 bg-gray-800 border-b border-gray-700 overflow-hidden"
            style={{ height: HEADER_HEIGHT }}
          >
            <div
              className="flex"
              style={{
                minWidth: relevantAccounts.length * CELL_WIDTH,
                transform: `translateX(-${scrollLeft}px)`
              }}
            >
              {relevantAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex-shrink-0 px-2 py-2 border-r border-gray-700/50 text-center flex items-center justify-center"
                  style={{ width: CELL_WIDTH, height: HEADER_HEIGHT }}
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
          </div>

          {/* Column totals row (frozen at top, scrolls horizontally with columns) */}
          <div
            className="flex-shrink-0 bg-gray-800/90 border-b-2 border-emerald-600/30 overflow-hidden"
            style={{ height: ROW_HEIGHT }}
          >
            <div
              className="flex"
              style={{
                minWidth: relevantAccounts.length * CELL_WIDTH,
                transform: `translateX(-${scrollLeft}px)`
              }}
            >
              {columnTotals.map((total) => (
                <div
                  key={total.accountId}
                  className="flex-shrink-0 flex items-center justify-end px-2 border-r border-gray-700/50 text-sm font-semibold text-emerald-400"
                  style={{ width: CELL_WIDTH }}
                >
                  {formatCurrency(total.totalValue)}
                </div>
              ))}
            </div>
          </div>

          {/* Data cells - scrollable both ways */}
          <div
            ref={dataContainerRef}
            className="flex-1 overflow-auto"
            onScroll={handleDataScroll}
          >
            <div style={{ minWidth: relevantAccounts.length * CELL_WIDTH }}>
              {gridMatrix.map((row, rowIndex) => (
                <div
                  key={row.rowKey}
                  className="flex border-b border-gray-700/30"
                  style={{ height: ROW_HEIGHT }}
                >
                  {row.cells.map((cell, cellIndex) => {
                    // Get account data for this column
                    const account = relevantAccounts.find(a => a.id === cell.accountId);

                    // Get new position value if any
                    const newPosValue = getNewPositionValue?.(
                      row.identifier,
                      row.purchaseDate,
                      cell.accountId
                    );

                    return (
                      <div
                        key={cell.accountId}
                        className="flex-shrink-0 relative"
                        style={{ width: CELL_WIDTH, height: ROW_HEIGHT }}
                      >
                        <QuantityCell
                          position={cell.position}
                          draftValue={getDraftValue(cell.position)}
                          onDraftChange={setDraft}
                          hasPosition={cell.hasPosition}
                          showFullPrecision={showFullPrecision}
                          rowIndex={rowIndex}
                          cellIndex={cellIndex}
                          // New position props
                          newPositionValue={newPosValue}
                          onNewPositionChange={onNewPositionChange}
                          rowData={{
                            ticker: row.ticker, // Actual symbol for QuickStart seeding
                            identifier: row.identifier,
                            name: row.name,
                            purchaseDate: row.purchaseDate,
                            assetType: row.assetType
                          }}
                          accountData={account ? {
                            id: account.id,
                            name: account.name,
                            institution: account.institution
                          } : null}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>

      {/* Scroll shadow indicator */}
      {scrollLeft > 0 && (
        <div className="absolute top-0 bottom-0 left-[280px] w-4 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
};

export default QuantityGrid;
