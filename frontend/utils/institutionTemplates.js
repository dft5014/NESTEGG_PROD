/**
 * Institution-Specific CSV Template Mappings
 *
 * This file contains pre-configured column mappings for major financial institutions.
 * When users upload statements, we'll attempt to auto-detect the institution and apply
 * the appropriate mapping template.
 */

/**
 * Pre-configured templates for major financial institutions
 * Each template includes:
 * - name: Display name of the institution
 * - columnMappings: Object mapping our fields to possible column names from that institution
 * - identifiers: Keywords to auto-detect the institution from file content
 * - dateFormats: Common date formats used by the institution
 */
export const INSTITUTION_TEMPLATES = {
  fidelity: {
    name: 'Fidelity Investments',
    columnMappings: {
      symbol: ['Symbol', 'Ticker', 'Fund Symbol'],
      quantity: ['Quantity', 'Shares', 'Number of Shares'],
      purchasePrice: ['Last Price', 'Price', 'Last', 'Cost Basis Per Share'],
      currentValue: ['Current Value', 'Market Value', 'Total Value'],
      description: ['Description', 'Security Description', 'Fund Name'],
      purchaseDate: ['Purchase Date', 'Acquired Date', 'Date Acquired'],
      costBasis: ['Cost Basis Total', 'Total Cost']
    },
    identifiers: ['Fidelity', 'FMR LLC', 'fidelity.com'],
    dateFormats: ['MM/DD/YYYY', 'M/D/YYYY']
  },

  vanguard: {
    name: 'Vanguard',
    columnMappings: {
      symbol: ['Symbol', 'Ticker Symbol', 'Fund Ticker'],
      quantity: ['Shares', 'Quantity', 'Number of Shares'],
      purchasePrice: ['Price', 'Share Price', 'Last Price'],
      currentValue: ['Total Value', 'Market Value', 'Current Value'],
      description: ['Investment Name', 'Fund Name', 'Description'],
      purchaseDate: ['Purchase Date', 'Date'],
      costBasis: ['Cost Basis', 'Total Cost']
    },
    identifiers: ['Vanguard', 'The Vanguard Group', 'vanguard.com'],
    dateFormats: ['MM/DD/YYYY', 'YYYY-MM-DD']
  },

  schwab: {
    name: 'Charles Schwab',
    columnMappings: {
      symbol: ['Symbol', 'Ticker'],
      quantity: ['Quantity', 'Shares'],
      purchasePrice: ['Price', 'Last Price', 'Market Price'],
      currentValue: ['Market Value', 'Value', 'Total Market Value'],
      description: ['Description', 'Security Description'],
      purchaseDate: ['Date Acquired', 'Purchase Date'],
      costBasis: ['Cost Basis', 'Total Cost']
    },
    identifiers: ['Schwab', 'Charles Schwab', 'schwab.com'],
    dateFormats: ['MM/DD/YYYY', 'M/D/YY']
  },

  merrill: {
    name: 'Merrill Lynch',
    columnMappings: {
      symbol: ['Symbol', 'Ticker', 'Fund Symbol'],
      quantity: ['Qty', 'Quantity', 'Shares'],
      purchasePrice: ['Last', 'Last Price', 'Price'],
      currentValue: ['Value', 'Total Value', 'Market Value'],
      description: ['Description', 'Security Name', 'Investment'],
      purchaseDate: ['Purchase Date', 'Date'],
      costBasis: ['Cost Basis', 'Total Cost Basis']
    },
    identifiers: ['Merrill Lynch', 'Bank of America Merrill', 'Merrill', 'ml.com'],
    dateFormats: ['MM/DD/YYYY', 'M/D/YYYY']
  },

  bofa: {
    name: 'Bank of America',
    columnMappings: {
      symbol: ['Symbol', 'Ticker'],
      quantity: ['Shares', 'Quantity'],
      purchasePrice: ['Price', 'Share Price'],
      currentValue: ['Value', 'Total Value', 'Current Value'],
      description: ['Name', 'Security', 'Description'],
      purchaseDate: ['Date', 'Purchase Date'],
      costBasis: ['Cost', 'Total Cost']
    },
    identifiers: ['Bank of America', 'BofA', 'bankofamerica.com'],
    dateFormats: ['MM/DD/YYYY']
  },

  etrade: {
    name: 'E*TRADE',
    columnMappings: {
      symbol: ['Symbol', 'Ticker'],
      quantity: ['Quantity', 'Qty', 'Shares'],
      purchasePrice: ['Last Price', 'Price'],
      currentValue: ['Market Value', 'Value'],
      description: ['Description', 'Security'],
      purchaseDate: ['Acquisition Date', 'Date Acquired'],
      costBasis: ['Cost Basis', 'Basis']
    },
    identifiers: ['E*TRADE', 'ETRADE', 'etrade.com'],
    dateFormats: ['MM/DD/YYYY', 'M/D/YY']
  },

  tdameritrade: {
    name: 'TD Ameritrade',
    columnMappings: {
      symbol: ['Symbol', 'Ticker'],
      quantity: ['Quantity', 'Qty'],
      purchasePrice: ['Last', 'Last Price'],
      currentValue: ['Market Value', 'Value'],
      description: ['Description', 'Security Description'],
      purchaseDate: ['Date Acquired', 'Acquisition Date'],
      costBasis: ['Cost Basis', 'Total Cost']
    },
    identifiers: ['TD Ameritrade', 'TDAmeritrade', 'tdameritrade.com'],
    dateFormats: ['MM/DD/YYYY']
  },

  interactiveBrokers: {
    name: 'Interactive Brokers',
    columnMappings: {
      symbol: ['Symbol', 'Ticker', 'ConID'],
      quantity: ['Quantity', 'Position'],
      purchasePrice: ['Mark Price', 'Price', 'Last'],
      currentValue: ['Market Value', 'Value in USD', 'Value'],
      description: ['Description', 'Asset Description'],
      purchaseDate: ['Date'],
      costBasis: ['Cost Basis', 'Average Cost']
    },
    identifiers: ['Interactive Brokers', 'IBKR', 'interactivebrokers.com'],
    dateFormats: ['YYYY-MM-DD', 'YYYYMMDD']
  },

  robinhood: {
    name: 'Robinhood',
    columnMappings: {
      symbol: ['Symbol', 'Ticker'],
      quantity: ['Quantity', 'Shares'],
      purchasePrice: ['Average Cost', 'Average Buy Price'],
      currentValue: ['Total Return', 'Market Value'],
      description: ['Name', 'Security Name'],
      purchaseDate: ['Date'],
      costBasis: ['Total Cost', 'Equity']
    },
    identifiers: ['Robinhood', 'robinhood.com'],
    dateFormats: ['YYYY-MM-DD', 'MM/DD/YYYY']
  },

  wealthfront: {
    name: 'Wealthfront',
    columnMappings: {
      symbol: ['Ticker', 'Symbol'],
      quantity: ['Shares', 'Quantity'],
      purchasePrice: ['Price', 'Share Price'],
      currentValue: ['Market Value', 'Value'],
      description: ['Name', 'Security'],
      purchaseDate: ['Date'],
      costBasis: ['Cost Basis']
    },
    identifiers: ['Wealthfront', 'wealthfront.com'],
    dateFormats: ['YYYY-MM-DD']
  }
};

/**
 * Generic fuzzy matching keywords for when institution auto-detection fails
 * These are common column header patterns across all institutions
 */
export const GENERIC_FIELD_KEYWORDS = {
  symbol: [
    'ticker', 'symbol', 'stock', 'fund symbol', 'security symbol',
    'cusip', 'ticker symbol', 'stock symbol', 'fund ticker'
  ],
  quantity: [
    'shares', 'units', 'quantity', 'qty', 'number of shares',
    'share quantity', 'position', 'holdings', 'balance'
  ],
  purchasePrice: [
    'price', 'cost', 'purchase price', 'last price', 'market price',
    'share price', 'unit price', 'price per share', 'last', 'current price',
    'average cost', 'cost per share', 'basis per share'
  ],
  currentValue: [
    'value', 'market value', 'current value', 'total value', 'balance',
    'market val', 'mkt value', 'total market value', 'position value'
  ],
  description: [
    'description', 'name', 'security name', 'investment name',
    'fund name', 'security description', 'asset description',
    'investment', 'security', 'asset'
  ],
  purchaseDate: [
    'purchase date', 'date', 'acquired date', 'date acquired',
    'acquisition date', 'buy date', 'open date'
  ],
  costBasis: [
    'cost basis', 'total cost', 'basis', 'total cost basis',
    'original cost', 'invested amount'
  ]
};

/**
 * Asset type detection keywords
 * Used to automatically determine asset_type from description or symbol
 */
export const ASSET_TYPE_KEYWORDS = {
  security: ['stock', 'equity', 'etf', 'fund', 'mutual fund', 'bond', 'note', 'reit'],
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency'],
  cash: ['cash', 'money market', 'savings', 'settlement fund', 'core position'],
  metal: ['gold', 'silver', 'platinum', 'palladium', 'precious metal']
};

/**
 * Auto-detect institution from file content
 * @param {Array<Object>} rows - Parsed CSV rows
 * @param {string} fileName - Original file name
 * @returns {string|null} - Institution key or null if not detected
 */
export function detectInstitution(rows, fileName = '') {
  if (!rows || rows.length === 0) return null;

  // Combine first few rows and filename for analysis
  const searchText = [
    fileName,
    ...rows.slice(0, 5).map(row => Object.values(row).join(' '))
  ].join(' ').toLowerCase();

  // Check each institution's identifiers
  for (const [key, template] of Object.entries(INSTITUTION_TEMPLATES)) {
    if (template.identifiers.some(id => searchText.includes(id.toLowerCase()))) {
      return key;
    }
  }

  return null;
}

/**
 * Fuzzy match a column header to our field names
 * @param {string} header - Column header from CSV
 * @param {Object} fieldKeywords - Keywords object (either institution-specific or generic)
 * @returns {string|null} - Matched field name or null
 */
export function fuzzyMatchColumn(header, fieldKeywords = GENERIC_FIELD_KEYWORDS) {
  if (!header) return null;

  const normalizedHeader = header.toLowerCase().trim();

  for (const [fieldName, keywords] of Object.entries(fieldKeywords)) {
    // Exact match
    if (keywords.some(keyword => normalizedHeader === keyword.toLowerCase())) {
      return fieldName;
    }

    // Partial match (header contains keyword or keyword contains header)
    if (keywords.some(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      return normalizedHeader.includes(normalizedKeyword) ||
             normalizedKeyword.includes(normalizedHeader);
    })) {
      return fieldName;
    }
  }

  return null;
}

/**
 * Auto-map columns based on institution template or fuzzy matching
 * @param {Array<string>} headers - Column headers from CSV
 * @param {string|null} institutionKey - Detected institution key
 * @returns {Object} - Mapping of our field names to CSV column headers
 */
export function autoMapColumns(headers, institutionKey = null) {
  const mapping = {};

  // Get the appropriate template
  const template = institutionKey ? INSTITUTION_TEMPLATES[institutionKey] : null;
  const fieldKeywords = template ? template.columnMappings : GENERIC_FIELD_KEYWORDS;

  // Try to map each of our required fields
  for (const fieldName of Object.keys(GENERIC_FIELD_KEYWORDS)) {
    // Try institution-specific mappings first
    if (template) {
      const possibleHeaders = fieldKeywords[fieldName] || [];
      for (const possibleHeader of possibleHeaders) {
        if (headers.includes(possibleHeader)) {
          mapping[fieldName] = possibleHeader;
          break;
        }
      }
    }

    // Fall back to fuzzy matching if not found
    if (!mapping[fieldName]) {
      for (const header of headers) {
        const match = fuzzyMatchColumn(header, { [fieldName]: GENERIC_FIELD_KEYWORDS[fieldName] });
        if (match === fieldName) {
          mapping[fieldName] = header;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Detect asset type from description or symbol
 * @param {string} description - Security description
 * @param {string} symbol - Ticker symbol
 * @returns {string} - Asset type (security, crypto, cash, metal, other)
 */
export function detectAssetType(description = '', symbol = '') {
  const searchText = `${description} ${symbol}`.toLowerCase();

  for (const [assetType, keywords] of Object.entries(ASSET_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return assetType;
    }
  }

  return 'security'; // Default to security
}

/**
 * Get all supported institution names for display
 * @returns {Array<Object>} - Array of {key, name} objects
 */
export function getSupportedInstitutions() {
  return Object.entries(INSTITUTION_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name
  }));
}
