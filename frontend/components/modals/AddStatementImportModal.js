import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
import * as XLSX from 'xlsx';
import {
  INSTITUTION_TEMPLATES,
  GENERIC_FIELD_KEYWORDS,
  detectInstitution,
  autoMapColumns,
  detectAssetType,
  getSupportedInstitutions
} from '@/utils/institutionTemplates';
import { useAccounts } from '@/store/hooks/useAccounts';
import {
  addSecurityPositionBulk,
  fetchPositions,
  updatePosition
} from '@/utils/apimethods/positionMethods';
import { createAccount } from '@/utils/apimethods/accountMethods';
import { formatCurrency } from '@/utils/formatters';
import {
  Upload, X, Check, AlertCircle, FileSpreadsheet, ChevronDown,
  Download, Building2, CheckCircle, Loader2, ArrowRight, Settings,
  Info, AlertTriangle, Trash2, Eye, EyeOff, RefreshCw, File,
  Plus, RefreshCcw, CheckCheck, ChevronRight, Square, CheckSquare,
  PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS FOR ACCOUNT CREATION
// ============================================================================

const INSTITUTION_LIST = [
  "Vanguard", "Fidelity", "Charles Schwab", "TD Ameritrade", "E*TRADE",
  "Robinhood", "Interactive Brokers", "Merrill Lynch", "T. Rowe Price",
  "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank",
  "Goldman Sachs", "Morgan Stanley", "Capital One", "Coinbase", "Kraken",
  "Gemini", "M1 Finance", "SoFi", "Other"
];

const ACCOUNT_CATEGORIES = [
  { id: 'brokerage', name: 'Investment/Brokerage' },
  { id: 'retirement', name: 'Retirement' },
  { id: 'cryptocurrency', name: 'Cryptocurrency' }
];

const ACCOUNT_TYPES_BY_CATEGORY = {
  brokerage: [
    { value: 'Individual', label: 'Individual' },
    { value: 'Joint', label: 'Joint' },
    { value: 'Custodial', label: 'Custodial' },
    { value: 'Trust', label: 'Trust' }
  ],
  retirement: [
    { value: 'Traditional IRA', label: 'Traditional IRA' },
    { value: 'Roth IRA', label: 'Roth IRA' },
    { value: '401(k)', label: '401(k)' },
    { value: 'Roth 401(k)', label: 'Roth 401(k)' },
    { value: '403(b)', label: '403(b)' },
    { value: 'SEP IRA', label: 'SEP IRA' },
    { value: 'HSA', label: 'HSA' }
  ],
  cryptocurrency: [
    { value: 'Exchange Account', label: 'Exchange Account' },
    { value: 'Hardware Wallet', label: 'Hardware Wallet' },
    { value: 'Software Wallet', label: 'Software Wallet' }
  ]
};

// ============================================================================
// DATA VALIDATION HELPERS - Ensure clean data before database insert
// ============================================================================

/**
 * Parses a formatted number string into a float
 * Handles currency symbols ($, €, £), thousands separators (,),
 * percentage signs (%), and parentheses for negatives
 * @param {any} value - Value to parse
 * @returns {number} - Parsed number or NaN if unparseable
 */
const parseFormattedNumber = (value) => {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;

  let str = String(value).trim();

  // Handle empty string
  if (str === '') return NaN;

  // Check for negative in parentheses: (100.00) -> -100.00
  const isNegativeParens = str.startsWith('(') && str.endsWith(')');
  if (isNegativeParens) {
    str = str.slice(1, -1);
  }

  // Remove currency symbols and whitespace
  str = str.replace(/[$€£¥₹\s]/g, '');

  // Remove percentage sign (but remember it was there)
  const isPercent = str.includes('%');
  str = str.replace(/%/g, '');

  // Remove thousands separators (commas)
  str = str.replace(/,/g, '');

  // Handle negative sign
  const isNegative = str.startsWith('-') || isNegativeParens;
  str = str.replace(/^-/, '');

  // Parse the number
  const num = parseFloat(str);

  if (isNaN(num)) return NaN;

  // Apply percentage conversion if needed (58.29% -> 0.5829)
  // Note: We don't auto-convert percentages since context matters
  // The caller can decide if they want to divide by 100

  return isNegative ? -num : num;
};

/**
 * Validates and sanitizes a numeric value
 * Returns 0 for NaN, null, undefined, Infinity, or negative Infinity
 * Now uses parseFormattedNumber for better string handling
 * @param {any} value - Value to validate
 * @param {number} defaultValue - Default to return if invalid (default: 0)
 * @returns {number} - Safe numeric value
 */
const sanitizeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const num = parseFormattedNumber(value);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  return num;
};

/**
 * Validates a position object before sending to backend
 * Ensures all numeric fields are valid and ticker exists
 * @param {Object} position - Position object to validate
 * @returns {Object|null} - Validated position or null if invalid
 */
const validatePosition = (position) => {
  // Require ticker
  if (!position.ticker || typeof position.ticker !== 'string' || position.ticker.trim() === '') {
    console.warn('[validatePosition] Invalid ticker:', position.ticker);
    return null;
  }

  // Sanitize numeric fields
  const shares = sanitizeNumber(position.shares);
  const price = sanitizeNumber(position.price);
  const cost_basis = sanitizeNumber(position.cost_basis);

  // Shares must be positive
  if (shares <= 0) {
    console.warn('[validatePosition] Invalid shares:', shares, 'for', position.ticker);
    return null;
  }

  // Price must be non-negative (could be 0 for some edge cases)
  if (price < 0) {
    console.warn('[validatePosition] Invalid price:', price, 'for', position.ticker);
    return null;
  }

  return {
    ticker: position.ticker.trim().toUpperCase(),
    shares: shares,
    price: price,
    cost_basis: cost_basis > 0 ? cost_basis : shares * price, // Default cost_basis if not provided
    purchase_date: position.purchase_date || new Date().toISOString().split('T')[0]
  };
};

// ============================================================================
// MATCHING LOGIC - Compare imported positions against existing account positions
// ============================================================================

const MATCH_TOLERANCE_PERCENT = 0.01; // 1% tolerance for "matches"

/**
 * Categorize imported positions by comparing to existing positions in the account
 * @param {Array} importedRows - Parsed rows from statement with mapped fields
 * @param {Array} existingPositions - Raw positions (tax lots) from the specific account
 * @param {Object} columnMappings - Field mappings from import
 * @returns {Object} - { new: [], differs: [], matches: [] }
 */
const categorizeImportedPositions = (importedRows, existingPositions, columnMappings) => {
  const result = {
    new: [],      // Symbol not in account - will be added
    differs: [],  // Symbol exists but quantity different - can update
    matches: []   // Symbol exists and values match - no action needed
  };

  // Build a lookup map of existing positions by ticker (uppercase)
  // IMPORTANT: Aggregate individual tax lots by ticker to get total shares per symbol
  const existingByTicker = {};
  (existingPositions || []).forEach(pos => {
    // fetchPositions returns 'ticker' field for each lot
    const ticker = (pos.ticker || pos.symbol || pos.identifier || '').toUpperCase().trim();
    if (ticker) {
      if (!existingByTicker[ticker]) {
        existingByTicker[ticker] = {
          ticker,
          totalShares: 0,
          lots: [],  // Store individual lots for reference
          name: pos.name || pos.security_name || ticker
        };
      }
      // Sum up shares from each lot
      const lotShares = parseFloat(pos.shares || pos.quantity || 0);
      existingByTicker[ticker].totalShares += lotShares;
      existingByTicker[ticker].lots.push(pos);
    }
  });

  console.log('[categorizeImportedPositions] Aggregated existing positions:',
    Object.entries(existingByTicker).map(([ticker, data]) => ({
      ticker,
      totalShares: data.totalShares,
      lotCount: data.lots.length
    }))
  );

  // Process each imported row
  importedRows.forEach((row, index) => {
    const ticker = (row[columnMappings.symbol] || '').toString().toUpperCase().trim();
    const importedQty = parseFloat(row[columnMappings.quantity]) || 0;
    const importedPrice = parseFloat(row[columnMappings.purchasePrice]) || 0;
    const importedValue = parseFloat(row[columnMappings.currentValue]) || (importedQty * importedPrice);
    const description = row[columnMappings.description] || '';

    // Skip invalid rows
    if (!ticker || importedQty <= 0) {
      return;
    }

    const importedItem = {
      index,
      ticker,
      quantity: importedQty,
      price: importedPrice,
      value: importedValue,
      description,
      rawRow: row
    };

    const existing = existingByTicker[ticker];

    if (!existing) {
      // NEW - ticker doesn't exist in account
      result.new.push({
        ...importedItem,
        category: 'new',
        actionLabel: 'Add to account'
      });
    } else {
      // Compare quantities
      const qtyDiff = Math.abs(importedQty - existing.totalShares);
      const qtyDiffPercent = existing.totalShares > 0
        ? qtyDiff / existing.totalShares
        : (importedQty > 0 ? 1 : 0);

      if (qtyDiffPercent <= MATCH_TOLERANCE_PERCENT) {
        // MATCHES - within tolerance
        result.matches.push({
          ...importedItem,
          category: 'matches',
          existingQuantity: existing.totalShares,
          existingLots: existing.lots,  // Individual tax lots for reference
          lotCount: existing.lots.length,
          quantityDiff: 0,
          actionLabel: 'Already accurate'
        });
      } else {
        // DIFFERS - quantity mismatch
        result.differs.push({
          ...importedItem,
          category: 'differs',
          existingQuantity: existing.totalShares,
          existingLots: existing.lots,  // Individual tax lots for reference
          lotCount: existing.lots.length,
          quantityDiff: importedQty - existing.totalShares,
          actionLabel: importedQty > existing.totalShares ? 'Add shares' : 'Reduce shares'
        });
      }
    }
  });

  return result;
};

// ============================================================================
// INSIGHTS VIEW COMPONENT - Shows categorized import results
// ============================================================================

const CategorySection = ({
  title,
  icon: Icon,
  items,
  color,
  bgColor,
  borderColor,
  selectedItems,
  onToggleItem,
  onToggleAll,
  showQuantityComparison = false,
  defaultExpanded = false
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const allSelected = items.length > 0 && items.every(item => selectedItems.has(item.index));
  const someSelected = items.some(item => selectedItems.has(item.index));

  if (items.length === 0) return null;

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 ${bgColor} transition-colors hover:brightness-110`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{title}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${color}`}>
                {items.length}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {items.length === 1 ? '1 position' : `${items.length} positions`}
            </p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="bg-gray-900/50">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800">
            <button
              onClick={() => onToggleAll(items, !allSelected)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : someSelected ? (
                <Square className="w-4 h-4 text-blue-400/50" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
            </button>
          </div>

          {/* Items list */}
          <div className="max-h-64 overflow-y-auto">
            {items.map((item) => {
              const isSelected = selectedItems.has(item.index);
              return (
                <div
                  key={item.index}
                  onClick={() => onToggleItem(item.index)}
                  className={`
                    flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-b-0
                    cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-900/20' : 'hover:bg-gray-800/50'}
                  `}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{item.ticker}</span>
                      {item.description && (
                        <span className="text-xs text-gray-500 truncate">
                          {item.description.slice(0, 30)}
                        </span>
                      )}
                    </div>

                    {showQuantityComparison ? (
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span className="text-gray-500">Statement:</span>
                        <span className="text-white">{item.quantity.toLocaleString()}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-gray-500">NestEgg:</span>
                        <span className="text-gray-300">{item.existingQuantity?.toLocaleString() || '0'}</span>
                        {item.lotCount > 1 && (
                          <span className="text-gray-500">({item.lotCount} lots)</span>
                        )}
                        {item.quantityDiff !== 0 && (
                          <span className={item.quantityDiff > 0 ? 'text-green-400' : 'text-red-400'}>
                            ({item.quantityDiff > 0 ? '+' : ''}{item.quantityDiff.toLocaleString()})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs mt-1 text-gray-400">
                        <span>{item.quantity.toLocaleString()} shares</span>
                        <span className="text-gray-600">•</span>
                        <span>{formatCurrency(item.value)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const InsightsView = ({
  categorizedData,
  selectedNew,
  selectedDiffers,
  onToggleNew,
  onToggleNewAll,
  onToggleDiffers,
  onToggleDiffersAll,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
        <p className="text-gray-400">Analyzing statement against your account...</p>
      </div>
    );
  }

  const { new: newItems, differs, matches } = categorizedData;
  const totalItems = newItems.length + differs.length + matches.length;

  if (totalItems === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-white font-medium">No valid positions found in statement</p>
        <p className="text-sm text-gray-400 mt-2">
          Check your column mappings and ensure the file contains position data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400">{newItems.length}</div>
          <div className="text-xs text-green-300/70">New Positions</div>
        </div>
        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-400">{differs.length}</div>
          <div className="text-xs text-yellow-300/70">Need Update</div>
        </div>
        <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-400">{matches.length}</div>
          <div className="text-xs text-blue-300/70">Already Match</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-white mb-1">Select which positions to process</p>
          <p className="text-gray-400">
            New positions will be added. Differing positions can be updated to match your statement.
            Matching positions need no action.
          </p>
        </div>
      </div>

      {/* Category sections */}
      <div className="space-y-3">
        <CategorySection
          title="New Positions"
          icon={Plus}
          items={newItems}
          color="text-green-400"
          bgColor="bg-green-900/30"
          borderColor="border-green-700/30"
          selectedItems={selectedNew}
          onToggleItem={onToggleNew}
          onToggleAll={onToggleNewAll}
          defaultExpanded={newItems.length > 0 && newItems.length <= 10}
        />

        <CategorySection
          title="Quantity Differs"
          icon={RefreshCcw}
          items={differs}
          color="text-yellow-400"
          bgColor="bg-yellow-900/30"
          borderColor="border-yellow-700/30"
          selectedItems={selectedDiffers}
          onToggleItem={onToggleDiffers}
          onToggleAll={onToggleDiffersAll}
          showQuantityComparison={true}
          defaultExpanded={differs.length > 0 && differs.length <= 10}
        />

        <CategorySection
          title="Already Matches"
          icon={CheckCheck}
          items={matches}
          color="text-blue-400"
          bgColor="bg-blue-900/30"
          borderColor="border-blue-700/30"
          selectedItems={new Set()} // Never selectable
          onToggleItem={() => {}}
          onToggleAll={() => {}}
          showQuantityComparison={true}
          defaultExpanded={false}
        />
      </div>

      {/* Action summary */}
      {(selectedNew.size > 0 || selectedDiffers.size > 0) && (
        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <CheckCircle className="w-4 h-4" />
            <span>
              Ready to process: {selectedNew.size > 0 && `${selectedNew.size} new`}
              {selectedNew.size > 0 && selectedDiffers.size > 0 && ', '}
              {selectedDiffers.size > 0 && `${selectedDiffers.size} updates`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HEADER ROW DETECTION - Auto-detect and allow manual adjustment
// ============================================================================

/**
 * Detect which row contains the header in a raw 2D array of cells
 * Returns the 0-based row index of the likely header row
 * @param {Array<Array>} rawRows - 2D array of cell values
 * @returns {Object} - { headerRowIndex, confidence, reason }
 */
const detectHeaderRow = (rawRows) => {
  if (!rawRows || rawRows.length === 0) {
    return { headerRowIndex: 0, confidence: 'low', reason: 'No data' };
  }

  // Common header keywords that suggest a row is a header
  const headerKeywords = [
    'symbol', 'ticker', 'security', 'name', 'description',
    'quantity', 'shares', 'qty', 'units',
    'price', 'cost', 'value', 'amount', 'market',
    'date', 'purchase', 'acquired',
    'type', 'account', 'cusip', 'isin'
  ];

  // Check each of the first 10 rows to find the best header candidate
  const maxRowsToCheck = Math.min(10, rawRows.length);
  let bestMatch = { index: 0, score: 0, reason: 'Default first row' };

  for (let i = 0; i < maxRowsToCheck; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    let keywordMatches = 0;
    let numericCount = 0;
    let textCount = 0;

    for (const cell of row) {
      const cellStr = String(cell || '').toLowerCase().trim();

      // Check for header keywords
      for (const keyword of headerKeywords) {
        if (cellStr.includes(keyword)) {
          keywordMatches++;
          score += 10;
          break;
        }
      }

      // Headers are usually text, not numbers
      if (cellStr && !isNaN(parseFormattedNumber(cellStr))) {
        numericCount++;
      } else if (cellStr && cellStr.length > 0) {
        textCount++;
      }
    }

    // Penalize rows with too many numeric values (likely data rows)
    if (numericCount > textCount && numericCount > 2) {
      score -= 5 * numericCount;
    }

    // Bonus for rows with mostly text
    if (textCount > numericCount && textCount >= 3) {
      score += 5;
    }

    // Strong indicator: multiple header keyword matches
    if (keywordMatches >= 2) {
      score += 20;
    }

    if (score > bestMatch.score) {
      bestMatch = {
        index: i,
        score: score,
        reason: keywordMatches > 0
          ? `Found ${keywordMatches} header keyword(s)`
          : 'Text-based row structure'
      };
    }
  }

  // Determine confidence
  let confidence = 'low';
  if (bestMatch.score >= 30) confidence = 'high';
  else if (bestMatch.score >= 15) confidence = 'medium';

  return {
    headerRowIndex: bestMatch.index,
    confidence,
    reason: bestMatch.reason
  };
};

/**
 * Parse Excel/CSV file with raw mode to detect header row
 * @param {File} file - File to parse
 * @returns {Promise<Object>} - Parsed file data with raw rows for header detection
 */
const parseFileRaw = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Get raw 2D array (all cells as strings)
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,  // Return as 2D array
          raw: false,
          defval: ''
        });

        // Detect header row
        const detection = detectHeaderRow(rawRows);

        resolve({
          fileName: file.name,
          rawRows,
          detectedHeaderRow: detection.headerRowIndex,
          headerConfidence: detection.confidence,
          headerReason: detection.reason,
          workbook,
          sheetName: firstSheetName
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert raw file data to JSON using a specific header row
 * @param {Object} rawFileData - Raw parsed file data from parseFileRaw
 * @param {number} headerRowIndex - Which row to use as header (0-indexed)
 * @returns {Object} - Parsed data with headers and data rows
 */
const applyHeaderRow = (rawFileData, headerRowIndex) => {
  const { rawRows, fileName } = rawFileData;

  if (!rawRows || rawRows.length <= headerRowIndex) {
    return { fileName, data: [], headers: [] };
  }

  // Get headers from the specified row
  const headerRow = rawRows[headerRowIndex];
  const headers = headerRow.map((h, idx) =>
    (h || '').toString().trim() || `Column ${idx + 1}`
  );

  // Convert remaining rows to objects
  const data = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Skip empty rows
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) continue;

    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx] || '';
    });
    data.push(rowObj);
  }

  return {
    fileName,
    data,
    headers,
    headerRowIndex,
    rawRows,  // Keep for re-parsing if user changes header row
    skippedRows: headerRowIndex  // How many title rows were skipped
  };
};

// Parse Excel/CSV file (legacy - still used for initial parse)
const parseFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        resolve({
          fileName: file.name,
          data: jsonData,
          headers: jsonData.length > 0 ? Object.keys(jsonData[0]) : []
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Step indicator component
const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                  ${isCompleted
                    ? 'bg-green-600 text-white'
                    : isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-600/20'
                      : 'bg-gray-700 text-gray-400'
                  }
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {step.label}
                </div>
                {step.sublabel && (
                  <div className="text-xs text-gray-500">{step.sublabel}</div>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${isCompleted ? 'bg-green-600' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// File upload zone
const FileUploadZone = ({ onFilesSelected, files, onRemoveFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
    );
    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles);
    } else {
      toast.error('Please upload Excel (.xlsx, .xls) or CSV files only');
    }
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    onFilesSelected(selectedFiles);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300
          ${isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-102'
            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`
            p-4 rounded-full transition-all duration-300
            ${isDragging ? 'bg-blue-600 scale-110' : 'bg-gray-700'}
          `}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`} />
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-white mb-1">
              {isDragging ? 'Drop your files here' : 'Upload bank statements'}
            </p>
            <p className="text-sm text-gray-400">
              Drag & drop or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports .xlsx, .xls, and .csv files from any institution
            </p>
          </div>

          {/* Supported institutions */}
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-2 text-center">Pre-configured for:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {getSupportedInstitutions().slice(0, 8).map(inst => (
                <span key={inst.key} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                  {inst.name}
                </span>
              ))}
              <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                + more
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Selected files ({files.length})</p>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveFile(index)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INLINE ACCOUNT CREATOR - Quick account creation within the modal
// ============================================================================

const InlineAccountCreator = ({ onAccountCreated, onCancel }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    institution: '',
    accountCategory: '',
    accountType: ''
  });

  const availableTypes = formData.accountCategory
    ? ACCOUNT_TYPES_BY_CATEGORY[formData.accountCategory] || []
    : [];

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Reset account type when category changes
      if (field === 'accountCategory') {
        updated.accountType = '';
      }
      return updated;
    });
  };

  const isValid = formData.accountName && formData.institution &&
    formData.accountCategory && formData.accountType;

  const handleCreate = async () => {
    if (!isValid) return;

    setIsCreating(true);
    try {
      const result = await createAccount({
        account_name: formData.accountName,
        institution: formData.institution,
        account_category: formData.accountCategory,
        type: formData.accountType
      });

      toast.success(`Account "${formData.accountName}" created!`);
      onAccountCreated(result);
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-blue-300 flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Create New Account
        </h4>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Account Name */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Account Name *</label>
          <input
            type="text"
            value={formData.accountName}
            onChange={(e) => handleChange('accountName', e.target.value)}
            placeholder="e.g., My Retirement Account"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Institution */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Institution *</label>
          <select
            value={formData.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {INSTITUTION_LIST.map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Category *</label>
          <select
            value={formData.accountCategory}
            onChange={(e) => handleChange('accountCategory', e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {ACCOUNT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Account Type */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Account Type *</label>
          <select
            value={formData.accountType}
            onChange={(e) => handleChange('accountType', e.target.value)}
            disabled={!formData.accountCategory}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">{formData.accountCategory ? 'Select...' : 'Choose category first'}</option>
            {availableTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!isValid || isCreating}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Account
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// LIVE DATA PREVIEW - Show sample data while mapping columns
// ============================================================================

const LiveDataPreview = ({ parsedData, mappings, headerRowIndex = 0 }) => {
  const [previewMode, setPreviewMode] = useState('first'); // 'first' or 'last'
  const [rowCount, setRowCount] = useState(2); // 1-10

  if (!parsedData || parsedData.length === 0 || !parsedData[0]?.data?.length) {
    return null;
  }

  const allData = parsedData[0].data;
  const totalRows = allData.length;

  // Get sample rows based on preview mode and row count
  const sampleRows = previewMode === 'first'
    ? allData.slice(0, Math.min(rowCount, totalRows))
    : allData.slice(Math.max(0, totalRows - rowCount));

  // Calculate the actual row numbers for display (1-indexed, accounting for header)
  const getRowNumber = (idx) => {
    if (previewMode === 'first') {
      return idx + 1 + headerRowIndex;
    } else {
      return totalRows - rowCount + idx + 1 + headerRowIndex;
    }
  };

  // Get mapped values for each sample row
  const getMappedValue = (row, field) => {
    const columnName = mappings[field];
    if (!columnName) return null;
    const value = row[columnName];
    return value;
  };

  // Format value for display
  const formatPreviewValue = (value, field) => {
    if (value === null || value === undefined) return <span className="text-gray-500">—</span>;

    // For numeric fields, try to parse and show formatted
    if (['quantity', 'purchasePrice', 'currentValue', 'costBasis'].includes(field)) {
      const parsed = parseFormattedNumber(value);
      if (!isNaN(parsed)) {
        const formatted = field === 'quantity'
          ? parsed.toLocaleString()
          : formatCurrency(parsed);
        return (
          <span className="text-white">
            {formatted}
            {String(value) !== String(parsed) && (
              <span className="text-xs text-gray-500 ml-1">← {String(value)}</span>
            )}
          </span>
        );
      }
    }

    return <span className="text-white">{String(value)}</span>;
  };

  const mappedFields = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'quantity', label: 'Qty' },
    { key: 'purchasePrice', label: 'Price' },
    { key: 'currentValue', label: 'Value' }
  ];

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Live Preview
        </h4>

        {/* Preview controls */}
        <div className="flex items-center gap-2">
          {/* First/Last toggle */}
          <div className="flex items-center bg-gray-900 rounded-lg p-0.5">
            <button
              onClick={() => setPreviewMode('first')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                previewMode === 'first'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              First
            </button>
            <button
              onClick={() => setPreviewMode('last')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                previewMode === 'last'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Last
            </button>
          </div>

          {/* Row count input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="10"
              value={rowCount}
              onChange={(e) => {
                const val = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                setRowCount(val);
              }}
              className="w-10 px-1.5 py-0.5 text-xs bg-gray-900 border border-gray-700 rounded text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">rows</span>
          </div>
        </div>
      </div>

      {/* Row info */}
      <div className="text-xs text-gray-500 mb-2">
        Showing {previewMode === 'first' ? 'first' : 'last'} {sampleRows.length} of {totalRows} data rows
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sampleRows.map((row, idx) => (
          <div key={idx} className="bg-gray-900/50 rounded p-2">
            <div className="text-xs text-gray-500 mb-1">Row {getRowNumber(idx)}</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {mappedFields.map(field => (
                <div key={field.key}>
                  <div className="text-gray-500">{field.label}</div>
                  <div className="truncate">
                    {mappings[field.key]
                      ? formatPreviewValue(getMappedValue(row, field.key), field.key)
                      : <span className="text-gray-600 italic">Not mapped</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Show conversion notice */}
      <div className="mt-2 text-xs text-gray-500 flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>Values like "$1,234.56" are automatically converted to numbers</span>
      </div>
    </div>
  );
};

// Column mapping interface
const ColumnMappingUI = ({
  parsedData,
  mappings,
  onMappingChange,
  detectedInstitution,
  headerRowIndex = 0,
  headerConfidence = 'low',
  headerReason = '',
  onHeaderRowChange,
  rawFileData
}) => {
  const [showAllColumns, setShowAllColumns] = useState(false);

  const requiredFields = ['symbol', 'quantity', 'purchasePrice'];
  const optionalFields = ['currentValue', 'description', 'purchaseDate', 'costBasis'];
  const allFields = [...requiredFields, ...optionalFields];

  const availableColumns = parsedData[0]?.headers || [];
  const displayFields = showAllColumns ? allFields : requiredFields;
  const totalRawRows = rawFileData?.[0]?.rawRows?.length || 0;
  const dataRowCount = parsedData[0]?.data?.length || 0;

  const fieldLabels = {
    symbol: 'Ticker/Symbol',
    quantity: 'Quantity/Shares',
    purchasePrice: 'Purchase Price',
    currentValue: 'Current Value',
    description: 'Description/Name',
    purchaseDate: 'Purchase Date',
    costBasis: 'Cost Basis'
  };

  const fieldDescriptions = {
    symbol: 'Stock ticker or symbol (required)',
    quantity: 'Number of shares or units (required)',
    purchasePrice: 'Price per share at purchase (required)',
    currentValue: 'Total position value (optional)',
    description: 'Security name or description (optional)',
    purchaseDate: 'Date of purchase (optional)',
    costBasis: 'Total amount invested (optional)'
  };

  // Confidence badge colors
  const confidenceColors = {
    high: 'bg-green-900/30 text-green-400 border-green-700/50',
    medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50',
    low: 'bg-gray-800 text-gray-400 border-gray-700'
  };

  return (
    <div className="space-y-4">
      {/* Header Row Detection Banner */}
      <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-white">Header Row Detection</p>
                <span className={`px-1.5 py-0.5 text-xs rounded border ${confidenceColors[headerConfidence]}`}>
                  {headerConfidence} confidence
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {headerReason || 'Using default first row'}
                {headerRowIndex > 0 && ` • Skipping ${headerRowIndex} title row${headerRowIndex > 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {dataRowCount} data rows detected from {totalRawRows} total rows
              </p>
            </div>
          </div>

          {/* Header row adjustment */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Header row:</label>
            <div className="flex items-center">
              <button
                onClick={() => onHeaderRowChange && onHeaderRowChange(headerRowIndex - 1)}
                disabled={headerRowIndex <= 0}
                className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded-l hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={totalRawRows}
                value={headerRowIndex + 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value) - 1;
                  if (!isNaN(val) && onHeaderRowChange) {
                    onHeaderRowChange(val);
                  }
                }}
                className="w-12 px-2 py-1 text-xs bg-gray-900 border-y border-gray-700 text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => onHeaderRowChange && onHeaderRowChange(headerRowIndex + 1)}
                disabled={headerRowIndex >= totalRawRows - 2}
                className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded-r hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Preview of header row content */}
        {rawFileData?.[0]?.rawRows?.[headerRowIndex] && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Current header columns:</p>
            <div className="flex flex-wrap gap-1">
              {rawFileData[0].rawRows[headerRowIndex].slice(0, 8).map((col, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-gray-900 text-gray-300 text-xs rounded">
                  {col || `(empty)`}
                </span>
              ))}
              {rawFileData[0].rawRows[headerRowIndex].length > 8 && (
                <span className="px-1.5 py-0.5 text-gray-500 text-xs">
                  +{rawFileData[0].rawRows[headerRowIndex].length - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Institution detection banner */}
      {detectedInstitution && (
        <div className="flex items-center space-x-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-300">
              Institution detected: {INSTITUTION_TEMPLATES[detectedInstitution].name}
            </p>
            <p className="text-xs text-green-400/70">
              Column mappings auto-configured
            </p>
          </div>
        </div>
      )}

      {/* Mapping grid */}
      <div className="space-y-3">
        {displayFields.map(field => {
          const isRequired = requiredFields.includes(field);
          const isMapped = !!mappings[field];

          return (
            <div
              key={field}
              className={`
                p-3 rounded-lg border transition-all
                ${isMapped
                  ? 'bg-gray-800/50 border-green-700/50'
                  : isRequired
                    ? 'bg-red-900/10 border-red-700/30'
                    : 'bg-gray-800/30 border-gray-700'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <label className="text-sm font-medium text-white">
                      {fieldLabels[field]}
                    </label>
                    {isRequired && (
                      <span className="px-1.5 py-0.5 bg-red-900/50 text-red-300 text-xs rounded">
                        Required
                      </span>
                    )}
                    {isMapped && (
                      <Check className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{fieldDescriptions[field]}</p>
                </div>

                <select
                  value={mappings[field] || ''}
                  onChange={(e) => onMappingChange(field, e.target.value)}
                  className={`
                    ml-4 px-3 py-1.5 bg-gray-900 border rounded-lg text-sm
                    ${isMapped ? 'border-green-700 text-white' : 'border-gray-700 text-gray-400'}
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                >
                  <option value="">-- Select column --</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle to show optional fields */}
      <button
        onClick={() => setShowAllColumns(!showAllColumns)}
        className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>{showAllColumns ? 'Hide' : 'Show'} optional fields</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showAllColumns ? 'rotate-180' : ''}`} />
      </button>

      {/* Live data preview */}
      <LiveDataPreview parsedData={parsedData} mappings={mappings} headerRowIndex={headerRowIndex} />
    </div>
  );
};

// Preview table
const PreviewTable = ({ data, mappings, limit = 10 }) => {
  const [showAll, setShowAll] = useState(false);

  const displayData = showAll ? data : data.slice(0, limit);
  const hasMore = data.length > limit;

  // Build preview rows using mappings
  const previewRows = useMemo(() => {
    return displayData.map((row, index) => ({
      original: row,
      mapped: {
        symbol: mappings.symbol ? row[mappings.symbol] : '',
        quantity: mappings.quantity ? row[mappings.quantity] : '',
        purchasePrice: mappings.purchasePrice ? row[mappings.purchasePrice] : '',
        currentValue: mappings.currentValue ? row[mappings.currentValue] : '',
        description: mappings.description ? row[mappings.description] : ''
      }
    }));
  }, [displayData, mappings]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">
          Preview ({data.length} positions)
        </h3>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAll ? 'Show less' : `Show all ${data.length}`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Symbol</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Quantity</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Price</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900/50">
            {previewRows.map((row, index) => (
              <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                <td className="px-3 py-2 text-white font-medium">{row.mapped.symbol || '—'}</td>
                <td className="px-3 py-2 text-gray-300">{row.mapped.quantity || '—'}</td>
                <td className="px-3 py-2 text-gray-300">{row.mapped.purchasePrice || '—'}</td>
                <td className="px-3 py-2 text-gray-300">{row.mapped.currentValue || '—'}</td>
                <td className="px-3 py-2 text-gray-400 truncate max-w-xs">{row.mapped.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main modal component
const AddStatementImportModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [detectedInstitution, setDetectedInstitution] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  // Header row detection state
  const [rawFileData, setRawFileData] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [headerConfidence, setHeaderConfidence] = useState('low');
  const [headerReason, setHeaderReason] = useState('');

  // New state for insights step
  const [existingPositions, setExistingPositions] = useState([]);
  const [categorizedData, setCategorizedData] = useState({ new: [], differs: [], matches: [] });
  const [selectedNew, setSelectedNew] = useState(new Set());
  const [selectedDiffers, setSelectedDiffers] = useState(new Set());
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const steps = [
    { id: 'upload', label: 'Upload', sublabel: 'Select files', icon: Upload },
    { id: 'map', label: 'Map Columns', sublabel: 'Configure fields', icon: Settings },
    { id: 'account', label: 'Select Account', sublabel: 'Choose destination', icon: Building2 },
    { id: 'insights', label: 'Review Insights', sublabel: 'Compare & select', icon: Eye },
    { id: 'confirm', label: 'Confirm', sublabel: 'Execute changes', icon: CheckCircle }
  ];

  // Use accounts from DataStore
  const {
    accounts: existingAccounts = [],
    loading: isLoadingAccounts,
    error: accountsError,
    lastFetched,
    refresh: refreshAccounts
  } = useAccounts();

  // DEBUG: Log accounts data
  useEffect(() => {
    console.log('[AddStatementImportModal] Accounts Debug:', {
      existingAccounts,
      isLoadingAccounts,
      accountsError,
      lastFetched,
      isOpen,
      currentStep,
      existingAccountsLength: existingAccounts?.length,
      existingAccountsIsArray: Array.isArray(existingAccounts),
      firstAccount: existingAccounts?.[0]
    });
  }, [existingAccounts, isLoadingAccounts, accountsError, lastFetched, isOpen, currentStep]);

  // Bootstrap fetch exactly once if we've never fetched accounts yet
  const bootstrapRef = useRef(false);
  useEffect(() => {
    console.log('[AddStatementImportModal] Bootstrap check:', {
      isOpen,
      bootstrapRefCurrent: bootstrapRef.current,
      isLoadingAccounts,
      lastFetched
    });

    if (!isOpen) return; // don't run when modal is closed
    if (bootstrapRef.current) return;
    // Only trigger if we have NEVER fetched accounts in this session
    if (!isLoadingAccounts && lastFetched == null) {
      console.log('[AddStatementImportModal] Triggering refreshAccounts()');
      bootstrapRef.current = true;
      refreshAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isLoadingAccounts, lastFetched, refreshAccounts]);

  // Filter accounts to only brokerage, retirement, and crypto
  const filteredAccounts = useMemo(() => {
    const accounts = Array.isArray(existingAccounts) ? existingAccounts : [];
    console.log('[AddStatementImportModal] Filtering accounts:', {
      totalAccounts: accounts.length,
      accountTypes: accounts.map(a => ({ id: a.id, name: a.name, type: a.type, category: a.category }))
    });

    const filtered = accounts.filter(acc => {
      // Use 'category' field (not 'type') - category is brokerage/retirement/crypto
      // 'type' contains specific types like 'Traditional IRA', 'Roth IRA', etc.
      const accountCategory = (acc?.category || '').toLowerCase();
      const isMatch = (
        accountCategory === 'brokerage' ||
        accountCategory === 'retirement' ||
        accountCategory === 'cryptocurrency'
      );

      console.log('[AddStatementImportModal] Account filter:', {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        category: acc.category,
        accountCategory,
        isMatch
      });

      return isMatch;
    });

    console.log('[AddStatementImportModal] Filtered accounts:', {
      filteredCount: filtered.length,
      filteredAccounts: filtered.map(a => ({ id: a.id, name: a.name, type: a.type, category: a.category }))
    });

    return filtered;
  }, [existingAccounts]);

  // Handle file selection - now uses header row detection
  const handleFilesSelected = async (selectedFiles) => {
    setIsProcessing(true);
    try {
      // Parse files with raw mode for header detection
      const rawParsed = await Promise.all(selectedFiles.map(parseFileRaw));
      setRawFileData(rawParsed);
      setFiles(selectedFiles);

      // Use detected header row for first file
      if (rawParsed.length > 0) {
        const detectedRow = rawParsed[0].detectedHeaderRow || 0;
        setHeaderRowIndex(detectedRow);
        setHeaderConfidence(rawParsed[0].headerConfidence || 'low');
        setHeaderReason(rawParsed[0].headerReason || '');

        // Apply the detected header row to get parsed data
        const parsed = rawParsed.map((raw, idx) => {
          const rowToUse = idx === 0 ? detectedRow : (rawParsed[idx].detectedHeaderRow || 0);
          return applyHeaderRow(raw, rowToUse);
        });
        setParsedData(parsed);

        // Auto-detect institution from first file
        if (parsed[0].data.length > 0) {
          const institution = detectInstitution(parsed[0].data, parsed[0].fileName);
          setDetectedInstitution(institution);

          // Auto-map columns
          const autoMapped = autoMapColumns(parsed[0].headers, institution);
          setColumnMappings(autoMapped);

          if (institution) {
            toast.success(`Detected ${INSTITUTION_TEMPLATES[institution].name} format`);
          }
        }

        // Notify about header detection if not row 0
        if (detectedRow > 0) {
          toast.success(`Detected header at row ${detectedRow + 1} (skipping ${detectedRow} title row${detectedRow > 1 ? 's' : ''})`);
        }
      }

      setCurrentStep(1); // Move to mapping step
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse files. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle header row change by user
  const handleHeaderRowChange = (newHeaderRow) => {
    const rowIndex = Math.max(0, Math.min(newHeaderRow, (rawFileData[0]?.rawRows?.length || 1) - 1));
    setHeaderRowIndex(rowIndex);

    // Re-parse data with new header row
    if (rawFileData.length > 0) {
      const parsed = rawFileData.map((raw, idx) => {
        const rowToUse = idx === 0 ? rowIndex : (raw.detectedHeaderRow || 0);
        return applyHeaderRow(raw, rowToUse);
      });
      setParsedData(parsed);

      // Re-detect institution and re-map columns
      if (parsed[0].data.length > 0) {
        const institution = detectInstitution(parsed[0].data, parsed[0].fileName);
        setDetectedInstitution(institution);
        const autoMapped = autoMapColumns(parsed[0].headers, institution);
        setColumnMappings(autoMapped);
      }

      toast.success(`Header row set to row ${rowIndex + 1}`);
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newParsedData = parsedData.filter((_, i) => i !== index);
    const newRawFileData = rawFileData.filter((_, i) => i !== index);
    setFiles(newFiles);
    setParsedData(newParsedData);
    setRawFileData(newRawFileData);

    if (newFiles.length === 0) {
      setCurrentStep(0);
      setColumnMappings({});
      setDetectedInstitution(null);
      setHeaderRowIndex(0);
      setHeaderConfidence('low');
      setHeaderReason('');
    }
  };

  const handleMappingChange = (field, columnName) => {
    setColumnMappings(prev => ({
      ...prev,
      [field]: columnName || undefined
    }));
  };

  const canProceedToAccount = () => {
    return columnMappings.symbol && columnMappings.quantity && columnMappings.purchasePrice;
  };

  const canProceedToReview = () => {
    return selectedAccount !== null;
  };

  const canProceedToConfirm = () => {
    return selectedNew.size > 0 || selectedDiffers.size > 0;
  };

  // Selection handlers for insights step
  const handleToggleNew = (index) => {
    setSelectedNew(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleNewAll = (items, shouldSelect) => {
    if (shouldSelect) {
      setSelectedNew(new Set(items.map(item => item.index)));
    } else {
      setSelectedNew(new Set());
    }
  };

  const handleToggleDiffers = (index) => {
    setSelectedDiffers(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleDiffersAll = (items, shouldSelect) => {
    if (shouldSelect) {
      setSelectedDiffers(new Set(items.map(item => item.index)));
    } else {
      setSelectedDiffers(new Set());
    }
  };

  // Load existing positions and categorize when moving to insights step
  const loadInsightsData = async () => {
    if (!selectedAccount || parsedData.length === 0) return;

    setIsLoadingInsights(true);
    try {
      // Fetch individual tax lots for this specific account
      // The matching logic will aggregate them by ticker for comparison
      const positions = await fetchPositions(selectedAccount);
      setExistingPositions(positions);

      console.log('[AddStatementImportModal] Fetched account positions (tax lots):', {
        count: positions.length,
        sample: positions.slice(0, 5).map(p => ({
          ticker: p.ticker,
          shares: p.shares,
          id: p.id
        }))
      });

      // Aggregate all imported rows from all files
      const allImportedRows = parsedData.flatMap(fileData => fileData.data);

      // Categorize imported positions
      const categorized = categorizeImportedPositions(
        allImportedRows,
        positions,
        columnMappings
      );

      setCategorizedData(categorized);

      // Auto-select all new items by default
      setSelectedNew(new Set(categorized.new.map(item => item.index)));
      // Don't auto-select differs - let user decide
      setSelectedDiffers(new Set());

      console.log('[AddStatementImportModal] Insights loaded:', {
        existingPositions: positions.length,
        new: categorized.new.length,
        differs: categorized.differs.length,
        matches: categorized.matches.length
      });
    } catch (error) {
      console.error('[AddStatementImportModal] Error loading insights:', error);
      toast.error('Failed to analyze positions. Please try again.');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Load insights when entering the insights step
  useEffect(() => {
    if (currentStep === 3 && selectedAccount) {
      loadInsightsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedAccount]);

  const handleImport = async () => {
    if (!selectedAccount) {
      toast.error('Please select an account');
      return;
    }

    if (selectedNew.size === 0 && selectedDiffers.size === 0) {
      toast.error('Please select at least one position to process');
      return;
    }

    setIsProcessing(true);

    try {
      let addedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errors = [];

      // Process NEW positions (add to account)
      if (selectedNew.size > 0) {
        const rawPositions = categorizedData.new
          .filter(item => selectedNew.has(item.index))
          .map(item => ({
            ticker: item.ticker,
            shares: item.quantity,
            price: item.price,
            cost_basis: item.quantity * item.price,
            purchase_date: item.rawRow[columnMappings.purchaseDate] || new Date().toISOString().split('T')[0]
          }));

        // Validate each position before sending
        const newPositionsToAdd = rawPositions
          .map(validatePosition)
          .filter(pos => pos !== null);

        const skippedCount = rawPositions.length - newPositionsToAdd.length;
        if (skippedCount > 0) {
          console.warn(`[AddStatementImportModal] Skipped ${skippedCount} invalid positions`);
          errors.push(`Skipped ${skippedCount} positions with invalid data`);
        }

        if (newPositionsToAdd.length > 0) {
          console.log('[AddStatementImportModal] Adding new positions:', newPositionsToAdd.length);
          console.log('[AddStatementImportModal] Sample validated position:', newPositionsToAdd[0]);
          try {
            await addSecurityPositionBulk(selectedAccount, newPositionsToAdd);
            addedCount = newPositionsToAdd.length;
          } catch (error) {
            console.error('[AddStatementImportModal] Error adding new positions:', error);
            errors.push(`Failed to add new positions: ${error.message}`);
            failedCount += newPositionsToAdd.length;
          }
        }
      }

      // Process DIFFERS positions (update existing)
      // For adding shares: create a new lot with the difference
      // For reducing shares: this requires manual lot selection (not automated)
      if (selectedDiffers.size > 0) {
        const differsToProcess = categorizedData.differs
          .filter(item => selectedDiffers.has(item.index));

        for (const item of differsToProcess) {
          try {
            if (item.quantityDiff > 0) {
              // Need to add more shares - create a new lot with the difference
              const rawLot = {
                ticker: item.ticker,
                shares: item.quantityDiff,
                price: item.price,
                cost_basis: item.quantityDiff * item.price,
                purchase_date: new Date().toISOString().split('T')[0]
              };

              // Validate the new lot before sending
              const newLot = validatePosition(rawLot);
              if (!newLot) {
                console.warn(`[AddStatementImportModal] Skipping invalid differs lot for ${item.ticker}`);
                errors.push(`Skipped ${item.ticker}: invalid data`);
                continue;
              }

              await addSecurityPositionBulk(selectedAccount, [newLot]);
              updatedCount++;
            } else if (item.quantityDiff < 0) {
              // Need to reduce shares - this requires selecting which lots to sell
              // For now, we skip this and inform the user
              console.warn(`[AddStatementImportModal] Skipping ${item.ticker}: reducing shares requires manual lot selection`);
              errors.push(`${item.ticker}: Reducing shares requires manual edit (sold ${Math.abs(item.quantityDiff).toLocaleString()} shares)`);
              // Don't count as failed - it's a known limitation
            }
          } catch (error) {
            console.error(`[AddStatementImportModal] Error updating ${item.ticker}:`, error);
            errors.push(`Failed to update ${item.ticker}: ${error.message}`);
            failedCount++;
          }
        }
      }

      console.log('[AddStatementImportModal] Import complete:', {
        added: addedCount,
        updated: updatedCount,
        failed: failedCount
      });

      setImportResults({
        success: failedCount === 0,
        added: addedCount,
        updated: updatedCount,
        failed: failedCount,
        errors
      });

      if (failedCount === 0) {
        toast.success(`Successfully processed ${addedCount + updatedCount} positions!`);
      } else if (addedCount + updatedCount > 0) {
        toast.success(`Processed ${addedCount + updatedCount} positions with ${failedCount} failures`);
      } else {
        toast.error('Failed to process positions');
      }

      // Wait a moment then close on success
      if (failedCount === 0) {
        setTimeout(() => {
          onClose();
          resetModal();
        }, 2000);
      }

    } catch (error) {
      console.error('[AddStatementImportModal] Import error (full):', error);
      console.error('[AddStatementImportModal] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        response: error.response,
        cause: error.cause
      });

      const errorMessage = error.message || 'Import failed. Please try again.';
      toast.error(errorMessage);

      setImportResults({
        success: false,
        error: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setCurrentStep(0);
    setFiles([]);
    setParsedData([]);
    setSelectedAccount(null);
    setColumnMappings({});
    setDetectedInstitution(null);
    setImportResults(null);
    setShowCreateAccount(false);
    // Reset header row detection state
    setRawFileData([]);
    setHeaderRowIndex(0);
    setHeaderConfidence('low');
    setHeaderReason('');
    // Reset insights state
    setExistingPositions([]);
    setCategorizedData({ new: [], differs: [], matches: [] });
    setSelectedNew(new Set());
    setSelectedDiffers(new Set());
    setIsLoadingInsights(false);
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      resetModal();
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            files={files}
            onRemoveFile={handleRemoveFile}
          />
        );

      case 1:
        return parsedData.length > 0 && (
          <ColumnMappingUI
            parsedData={parsedData}
            mappings={columnMappings}
            onMappingChange={handleMappingChange}
            detectedInstitution={detectedInstitution}
            headerRowIndex={headerRowIndex}
            headerConfidence={headerConfidence}
            headerReason={headerReason}
            onHeaderRowChange={handleHeaderRowChange}
            rawFileData={rawFileData}
          />
        );

      case 2:
        console.log('[AddStatementImportModal] Rendering step 2 (account selection):', {
          isLoadingAccounts,
          filteredAccountsLength: filteredAccounts.length,
          filteredAccounts: filteredAccounts.map(a => ({ id: a.id, name: a.name, type: a.type, category: a.category }))
        });

        // Handler for when a new account is created
        const handleAccountCreated = async (newAccount) => {
          setShowCreateAccount(false);
          // Refresh accounts and select the new one
          await refreshAccounts();
          if (newAccount?.id) {
            setSelectedAccount(newAccount.id);
          }
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Select the account where these positions will be imported
              </p>
              {!showCreateAccount && (
                <button
                  onClick={() => setShowCreateAccount(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  New Account
                </button>
              )}
            </div>

            {/* Inline account creation form */}
            {showCreateAccount && (
              <InlineAccountCreator
                onAccountCreated={handleAccountCreated}
                onCancel={() => setShowCreateAccount(false)}
              />
            )}

            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-2 text-gray-400">Loading accounts...</span>
              </div>
            ) : filteredAccounts.length === 0 && !showCreateAccount ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No eligible accounts found</p>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Create a brokerage, retirement, or crypto account first
                </p>
                <button
                  onClick={() => setShowCreateAccount(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Account
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredAccounts.map(account => {
                  // Use correct field names from useAccounts hook
                  const accountName = account.name;
                  const accountInstitution = account.institution;
                  const accountType = account.type;

                  return (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccount(account.id)}
                      className={`
                        w-full p-4 rounded-lg border-2 transition-all text-left
                        ${selectedAccount === account.id
                          ? 'border-blue-600 bg-blue-900/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{accountName}</p>
                          <p className="text-sm text-gray-400">
                            {accountInstitution} • {accountType}
                          </p>
                        </div>
                        {selectedAccount === account.id && (
                          <CheckCircle className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 3:
        // Insights step - compare imported vs existing
        return (
          <InsightsView
            categorizedData={categorizedData}
            selectedNew={selectedNew}
            selectedDiffers={selectedDiffers}
            onToggleNew={handleToggleNew}
            onToggleNewAll={handleToggleNewAll}
            onToggleDiffers={handleToggleDiffers}
            onToggleDiffersAll={handleToggleDiffersAll}
            isLoading={isLoadingInsights}
          />
        );

      case 4:
        // Confirm step - show summary and execute
        const selectedAccountData = filteredAccounts.find(a => a.id === selectedAccount);
        const selectedAccountName = selectedAccountData?.name;
        const totalToAdd = selectedNew.size;
        const totalToUpdate = selectedDiffers.size;

        return (
          <div className="space-y-4">
            {/* Action summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-5 h-5 text-green-400" />
                  <p className="text-sm font-medium text-green-300">Adding</p>
                </div>
                <p className="text-2xl font-bold text-white">{totalToAdd}</p>
                <p className="text-xs text-gray-400">new positions</p>
              </div>
              <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCcw className="w-5 h-5 text-yellow-400" />
                  <p className="text-sm font-medium text-yellow-300">Updating</p>
                </div>
                <p className="text-2xl font-bold text-white">{totalToUpdate}</p>
                <p className="text-xs text-gray-400">existing positions</p>
              </div>
            </div>

            {/* Destination account */}
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Destination Account</p>
              <p className="text-white font-medium">{selectedAccountName}</p>
            </div>

            {/* Selected items preview */}
            {totalToAdd > 0 && (
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">New positions to add:</p>
                <div className="flex flex-wrap gap-2">
                  {categorizedData.new
                    .filter(item => selectedNew.has(item.index))
                    .slice(0, 10)
                    .map(item => (
                      <span key={item.index} className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded">
                        {item.ticker}
                      </span>
                    ))}
                  {totalToAdd > 10 && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                      +{totalToAdd - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {totalToUpdate > 0 && (
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Positions to update:</p>
                <div className="flex flex-wrap gap-2">
                  {categorizedData.differs
                    .filter(item => selectedDiffers.has(item.index))
                    .slice(0, 10)
                    .map(item => (
                      <span key={item.index} className="px-2 py-1 bg-yellow-900/30 text-yellow-300 text-xs rounded">
                        {item.ticker} ({item.quantityDiff > 0 ? '+' : ''}{item.quantityDiff.toLocaleString()})
                      </span>
                    ))}
                  {totalToUpdate > 10 && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                      +{totalToUpdate - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start space-x-3 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">
                  Ready to process
                </p>
                <p className="text-xs text-blue-400/70 mt-1">
                  Click "Execute Changes" to add {totalToAdd} new positions
                  {totalToUpdate > 0 && ` and update ${totalToUpdate} existing positions`} in {selectedAccountName}.
                </p>
              </div>
            </div>

            {/* Results (if import completed) */}
            {importResults && (
              <div className={`
                flex items-start space-x-3 p-3 rounded-lg border
                ${importResults.success
                  ? 'bg-green-900/20 border-green-700'
                  : 'bg-red-900/20 border-red-700'
                }
              `}>
                {importResults.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-300">
                        Changes applied successfully!
                      </p>
                      <p className="text-xs text-green-400/70 mt-1">
                        {importResults.added > 0 && `Added ${importResults.added} positions`}
                        {importResults.added > 0 && importResults.updated > 0 && ', '}
                        {importResults.updated > 0 && `Updated ${importResults.updated} positions`}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-300">
                        {importResults.added > 0 || importResults.updated > 0
                          ? 'Completed with errors'
                          : 'Failed to process'
                        }
                      </p>
                      <p className="text-xs text-red-400/70 mt-1">
                        {importResults.errors?.length > 0
                          ? importResults.errors.slice(0, 2).join('; ')
                          : 'Unknown error occurred'}
                        {importResults.errors?.length > 2 && ` (+${importResults.errors.length - 2} more)`}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Smart Statement Import"
      subtitle="Import, compare, and sync positions from your brokerage statements"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Step indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Step content */}
        <div className="min-h-[400px]">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center h-96">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-gray-400">Processing files...</p>
            </div>
          ) : (
            renderStepContent()
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : handleClose()}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center space-x-3">
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 0 && files.length === 0) ||
                  (currentStep === 1 && !canProceedToAccount()) ||
                  (currentStep === 2 && !canProceedToReview()) ||
                  (currentStep === 3 && !canProceedToConfirm()) ||
                  isLoadingInsights
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>{currentStep === 3 ? 'Confirm Selection' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={isProcessing || importResults?.success}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : importResults?.success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Done!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Execute Changes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </FixedModal>
  );
};

// Export button component for navbar
export const QuickStatementImportButton = ({ className = '', label = 'Import' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${className}`}
        title="Import statement positions"
      >
        <Upload className="w-4 h-4" />
        <span>{label}</span>
      </button>
      <AddStatementImportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default AddStatementImportModal;
