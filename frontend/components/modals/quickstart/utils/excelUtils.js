// Excel Utilities for QuickStart Modal
// Ported from original QuickStartModal.js for feature parity
import { fetchWithAuth } from '@/utils/api';

// ============================================
// Date/Number Parsing Helpers
// ============================================

// Normalize string values
export const norm = (v) => String(v ?? '').trim();
export const normLower = (v) => norm(v).toLowerCase();

// Parse number from various formats
export const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

// Excel (1900 system) day serial -> YYYY-MM-DD
export const excelSerialToISO = (n) => {
  if (!Number.isFinite(n)) return undefined;
  // Excel day 1 = 1899-12-31 (1900 leap bug). Using 1899-12-30 works well in practice.
  const baseUTC = Date.UTC(1899, 11, 30);
  const d = new Date(baseUTC + Math.round(n) * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return (y >= 1000 && y <= 9999) ? `${y}-${m}-${day}` : undefined;
};

// Final guard for <input type="date">
export const toDateInputValue = (s) => {
  if (!s) return '';
  return /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s)) ? s : '';
};

// Normalize XLSX values (Date | number | string) → YYYY-MM-DD
export const toDateString = (v) => {
  if (v == null || v === '') return undefined;

  // JS Date object
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return (y >= 1000 && y <= 9999) ? `${y}-${m}-${d}` : undefined;
  }

  // Excel serial number
  if (typeof v === 'number') {
    return excelSerialToISO(v);
  }

  const raw = String(v).trim();
  if (!raw) return undefined;

  // Handle "+043831-01-01" / "043831-01-01" by treating leading number as serial
  const serialish = raw.match(/^[+]?0*(\d{5,})-0?1-0?1$/);
  if (serialish) {
    const n = Number(serialish[1]);
    const iso = excelSerialToISO(n);
    if (iso) return iso;
  }

  // ISO-ish: YYYY-M-D or YYYY/M/D -> zero-pad
  const isoLoose = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (isoLoose) {
    const y = Number(isoLoose[1]);
    const m = String(isoLoose[2]).padStart(2, '0');
    const d = String(isoLoose[3]).padStart(2, '0');
    return (y >= 1000 && y <= 9999) ? `${y}-${m}-${d}` : undefined;
  }

  // US-style M/D/YYYY or M-D-YYYY
  const us = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (us) {
    let y = Number(us[3]);
    if (us[3].length === 2) y = 2000 + y; // naive 2-digit year
    const m = String(us[1]).padStart(2, '0');
    const d = String(us[2]).padStart(2, '0');
    return (y >= 1000 && y <= 9999) ? `${y}-${m}-${d}` : undefined;
  }

  // Last-chance parse
  const d = new Date(raw);
  if (Number.isFinite(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return (y >= 1000 && y <= 9999) ? `${y}-${m}-${dd}` : undefined;
  }

  return undefined;
};

// Lenient header matcher: case/space-insensitive
export const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

// ============================================
// File Reading
// ============================================

export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

// ============================================
// Template Download
// ============================================

export const downloadTemplate = async (type, setDownloading) => {
  if (setDownloading) setDownloading(true);
  try {
    const response = await fetchWithAuth(`/api/templates/${type}/download`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${type} template`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NestEgg_${type.charAt(0).toUpperCase() + type.slice(1)}_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Error downloading template:', error);
    throw error;
  } finally {
    if (setDownloading) setDownloading(false);
  }
};

// ============================================
// Excel Parsing - Positions
// ============================================

// Create a seed row for imported data
const seedRow = (type, data) => ({
  id: crypto.randomUUID(),
  type,
  data,
  errors: {},
  isNew: true,
  animateIn: true,
  status: 'ready'
});

// Parse the Positions template tabs into UI shape
export const parsePositionsExcel = async (file, accountNameToId) => {
  const buf = await readFileAsArrayBuffer(file);
  const XLSX = await import('xlsx');
  // Keep real Excel dates as JS Date objects
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const findSheet = (part) =>
    wb.SheetNames.find((n) => normLower(n).includes(part));

  // Always skip the banner row (row 1) and read textual values
  const rowsFrom = (sheetName) =>
    XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: false, range: 1 });

  const result = { security: [], cash: [], crypto: [], metal: [] };

  const accountIdFor = (name) => {
    const key = normLower(name);
    return accountNameToId.get(key);
  };

  // --- SECURITIES ---
  const secSheetName = findSheet('secur'); // matches "📈 SECURITIES"
  if (secSheetName) {
    const rows = rowsFrom(secSheetName);

    rows.forEach((r) => {
      const account = r['Account'] ?? r['Account*'] ?? r['account'];
      // accept both "Identifier / Ticker" and "Ticker"/"Symbol"
      const ticker = r['Identifier / Ticker'] ?? r['Ticker'] ?? r['Symbol'] ?? r['symbol'];
      const name = r['Company Name'] ?? r['Name'] ?? r['Company'] ?? '';
      const shares = r['Shares'] ?? r['Quantity'];
      const cost = r['Cost Basis*'] ?? r['Cost Basis'] ?? r['Purchase Price'] ?? r['Price'];
      const date = r['Purchase Date*'] ?? r['Purchase Date'] ?? r['Acquired Date (YYYY-MM-DD)'];

      const acctNorm = norm(account);
      const tickNorm = norm(ticker);

      // Skip the instruction row and the example placeholder rows
      const isInstruction = acctNorm.startsWith('⚠');
      const isPlaceholder = /^select account/i.test(acctNorm);
      const isEmptyRow =
        !acctNorm && !tickNorm && !toNumber(shares) && !toNumber(cost) && !toDateString(date);

      if (isInstruction || isPlaceholder || isEmptyRow) return;

      // Require both Account and Ticker to push a row
      if (!acctNorm || !tickNorm) return;

      result.security.push(
        seedRow('security', {
          account_id: accountIdFor(account),
          account_name: acctNorm,
          ticker: tickNorm,
          name: norm(name),
          shares: toNumber(shares),
          cost_basis: toNumber(cost),
          purchase_date: toDateString(date),
        })
      );
    });
  }

  // --- CASH ---
  const cashSheetName = findSheet('cash'); // matches "💵 CASH"
  if (cashSheetName) {
    const rows = rowsFrom(cashSheetName);

    rows.forEach((r) => {
      const account = r['Account'] ?? r['Account*'] ?? r['account'];
      const cashType = r['Cash Type'] ?? r['Cash Type*'] ?? r['Type'];
      const amount = r['Amount'] ?? r['Amount*'];
      const rate = r['Interest Rate (%)'] ?? r['Interest Rate'] ?? r['Rate'];
      const maturity = r['Maturity Date'] ?? r['Maturity'];

      const acctNorm = norm(account);
      const typeNorm = norm(cashType);

      const isInstruction = acctNorm.startsWith('⚠');
      const isPlaceholder = /^select account/i.test(acctNorm);
      const isEmptyRow = !acctNorm && !typeNorm && !toNumber(amount);

      if (isInstruction || isPlaceholder || isEmptyRow) return;

      // Required for CASH: Account + Cash Type + Amount
      if (!acctNorm || !typeNorm || !toNumber(amount)) return;

      result.cash.push(
        seedRow('cash', {
          account_id: accountIdFor(account),
          account_name: acctNorm,
          cash_type: typeNorm,
          amount: toNumber(amount),
          interest_rate: toNumber(rate),
          maturity_date: toDateString(maturity),
        })
      );
    });
  }

  // --- CRYPTO ---
  const cryptoSheetName = findSheet('crypto'); // matches "🪙 CRYPTO"
  if (cryptoSheetName) {
    const rows = rowsFrom(cryptoSheetName);

    rows.forEach((r) => {
      const account = r['Account'] ?? r['Account*'] ?? r['account'];
      const symbol = r['Symbol'] ?? r['Symbol*'] ?? r['Ticker'];
      const name = r['Name'] ?? '';
      const qty = r['Quantity'] ?? r['Quantity*'];
      const price = r['Purchase Price'] ?? r['Purchase Price*'] ?? r['Price'];
      const date = r['Purchase Date'] ?? r['Purchase Date*'];

      const acctNorm = norm(account);
      const symNorm = norm(symbol);

      const isInstruction = acctNorm.startsWith('⚠');
      const isPlaceholder = /^select account/i.test(acctNorm);
      const isEmptyRow = !acctNorm && !symNorm && !toNumber(qty) && !toNumber(price);

      if (isInstruction || isPlaceholder || isEmptyRow) return;

      // Require Account + Symbol
      if (!acctNorm || !symNorm) return;

      result.crypto.push(
        seedRow('crypto', {
          account_id: accountIdFor(account),
          account_name: acctNorm,
          symbol: symNorm,
          name: norm(name),
          quantity: toNumber(qty),
          purchase_price: toNumber(price),
          purchase_date: toDateString(date),
        })
      );
    });
  }

  // --- METALS ---
  const metalSheetName = findSheet('metal'); // matches "🥇 METALS"
  if (metalSheetName) {
    const rows = rowsFrom(metalSheetName);

    rows.forEach((r) => {
      const account = r['Account'] ?? r['Account*'] ?? r['account'];
      const mtype = r['Metal Type'] ?? r['Metal Type*'] ?? r['Metal'];
      const code = r['Metal Code'] ?? r['Symbol'] ?? r['Ticker'] ?? ''; // ok if blank
      const qty = r['Quantity (oz)'] ?? r['Quantity (oz)*'] ?? r['Quantity'];
      const price = r['Purchase Price/oz'] ?? r['Purchase Price/oz*'] ?? r['Price/Unit'] ?? r['Purchase Price'];
      const date = r['Purchase Date'] ?? r['Purchase Date*'];

      const acctNorm = norm(account);
      const typeNorm = norm(mtype);

      const isInstruction = acctNorm.startsWith('⚠');
      const isPlaceholder = /^select account/i.test(acctNorm);
      const isEmptyRow = !acctNorm && !typeNorm && !toNumber(qty) && !toNumber(price);

      if (isInstruction || isPlaceholder || isEmptyRow) return;

      // Require Account + Metal Type (code can be blank; UI/Excel VLOOKUP fills it)
      if (!acctNorm || !typeNorm) return;

      result.metal.push(
        seedRow('metal', {
          account_id: accountIdFor(account),
          account_name: acctNorm,
          metal_type: typeNorm,
          symbol: norm(code),
          name: '',
          quantity: toNumber(qty),
          unit: 'oz',
          purchase_price: toNumber(price),
          purchase_date: toDateString(date),
        })
      );
    });
  }

  return result;
};

// ============================================
// Excel Parsing - Accounts
// ============================================

const REQUIRED_ACCOUNT_HEADERS = ['Account Name', 'Institution', 'Account Category', 'Account Type'];

export const parseAccountsExcel = async (file, accountCategories) => {
  const buf = await readFileAsArrayBuffer(file);
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === 'accounts') ||
    wb.SheetNames[0];

  const sheet = wb.Sheets[sheetName];

  // First try: assume header row is the first row after banner; if not, fallback
  let rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length || Object.keys(rows[0] || {}).length <= 1) {
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, range: 1 });
  }

  if (!rows.length) return [];

  // Build a case-insensitive header map using the first row's keys
  const headerKeys = Object.keys(rows[0]);
  const headerMap = {};
  for (const k of headerKeys) headerMap[normalizeHeader(k)] = k;

  // Verify required headers exist (leniently)
  const missing = REQUIRED_ACCOUNT_HEADERS.filter(
    (req) => !(normalizeHeader(req) in headerMap)
  );
  if (missing.length) {
    throw new Error(`Missing required column(s): ${missing.join(', ')}`);
  }

  const mapVal = (row, label) =>
    String(row[headerMap[normalizeHeader(label)]] ?? '').trim();

  // Build UI-shape accounts array
  const parsed = rows
    .map((r) => {
      const accountName = mapVal(r, 'Account Name');
      const institution = mapVal(r, 'Institution');
      const accountCategory = mapVal(r, 'Account Category'); // id or label
      const accountType = mapVal(r, 'Account Type');

      const hasAnyValue = [accountName, institution, accountCategory, accountType]
        .some((v) => v && v.length > 0);
      if (!hasAnyValue) return null; // skip fully empty rows

      return {
        id: crypto.randomUUID(),
        accountName,
        institution,
        accountCategory,
        accountType,
        isNew: true,
        status: 'ready'
      };
    })
    .filter(Boolean);

  // Translate category labels → ids if needed
  if (accountCategories) {
    const categoryNames = new Map(
      accountCategories.map((c) => [c.name.toLowerCase(), c.id])
    );
    parsed.forEach((a) => {
      const lowered = String(a.accountCategory || '').toLowerCase();
      if (categoryNames.has(lowered)) a.accountCategory = categoryNames.get(lowered);
    });
  }

  // Build account type label → value map for translation
  // This handles cases where Excel has "Pension" but we need "pension"
  const accountTypeLabels = new Map();
  const ACCOUNT_TYPES = {
    investment: [
      { value: 'brokerage', label: 'Taxable Brokerage' },
      { value: 'trust', label: 'Trust' },
      { value: 'custodial', label: 'Custodial (UTMA/UGMA)' },
      { value: 'other_investment', label: 'Other Investment' }
    ],
    retirement: [
      { value: '401k', label: '401(k)' },
      { value: '403b', label: '403(b)' },
      { value: 'ira', label: 'Traditional IRA' },
      { value: 'roth_ira', label: 'Roth IRA' },
      { value: 'sep_ira', label: 'SEP IRA' },
      { value: 'simple_ira', label: 'SIMPLE IRA' },
      { value: 'pension', label: 'Pension' },
      { value: 'hsa', label: 'HSA' },
      { value: 'other_retirement', label: 'Other Retirement' }
    ],
    cash: [
      { value: 'checking', label: 'Checking' },
      { value: 'savings', label: 'Savings' },
      { value: 'money_market', label: 'Money Market' },
      { value: 'cd', label: 'CD' },
      { value: 'other_cash', label: 'Other Cash' }
    ],
    crypto: [
      { value: 'exchange', label: 'Exchange' },
      { value: 'wallet', label: 'Wallet' },
      { value: 'defi', label: 'DeFi' },
      { value: 'other_crypto', label: 'Other Crypto' }
    ],
    alternative: [
      { value: 'real_estate', label: 'Real Estate' },
      { value: 'precious_metals', label: 'Precious Metals' },
      { value: 'collectibles', label: 'Collectibles' },
      { value: 'private_equity', label: 'Private Equity' },
      { value: 'other_alternative', label: 'Other Alternative' }
    ]
  };

  // Build the lookup map
  Object.values(ACCOUNT_TYPES).flat().forEach((t) => {
    accountTypeLabels.set(t.label.toLowerCase(), t.value);
    accountTypeLabels.set(t.value.toLowerCase(), t.value); // Also map value to itself
  });

  // Translate account type labels → values
  parsed.forEach((a) => {
    const lowered = String(a.accountType || '').toLowerCase();
    if (accountTypeLabels.has(lowered)) {
      a.accountType = accountTypeLabels.get(lowered);
    }
  });

  return parsed;
};

// ============================================
// Template Type Detection
// ============================================

export const detectTemplateType = async (file) => {
  const buf = await readFileAsArrayBuffer(file);
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  // 1) Quick sheet-name heuristic
  const sheetNamesNorm = wb.SheetNames.map((n) => (n || '').toLowerCase());
  if (sheetNamesNorm.some((n) => n.includes('accounts'))) return { kind: 'accounts', wb };

  // Positions template has per-tab sheets like "📈 SECURITIES", "💵 CASH", "🪙 CRYPTO", "🥇 METALS"
  const looksLikePositionsByName = sheetNamesNorm.some(
    (n) => n.includes('secur') || n.includes('cash') || n.includes('crypto') || n.includes('metal')
  );
  if (looksLikePositionsByName) return { kind: 'positions', wb };

  // 2) Header sniff across ALL sheets (not just the first)
  const normH = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Accounts template expected headers
  const ACC_HEADERS = ['account name', 'institution', 'account category', 'account type'];

  // Positions template per-tab expected header sets (lenient)
  const POS_HEADER_SETS = [
    // SECURITIES
    ['account', 'ticker', 'company name', 'shares', 'cost basis', 'purchase date'],
    // CRYPTO
    ['account', 'symbol', 'name', 'quantity', 'purchase price', 'purchase date'],
    // CASH (only first three are required)
    ['account', 'cash type', 'amount'],
    // METALS
    ['account', 'metal type', 'metal code', 'quantity (oz)', 'purchase price/oz', 'purchase date'],
  ];

  const sheetHasHeaders = (sheet, requiredHeaders) => {
    // Try normal header row; if it looks like a banner, try range:1
    let rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    if (!rows.length || Object.keys(rows[0] || {}).length <= 1) {
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, range: 1 });
    }
    if (!rows.length) return false;
    const keys = Object.keys(rows[0]).map((k) => normH(k));
    return requiredHeaders.every((h) => keys.includes(normH(h)));
  };

  // Try to detect Accounts
  for (const name of wb.SheetNames) {
    if (sheetHasHeaders(wb.Sheets[name], ACC_HEADERS)) {
      return { kind: 'accounts', wb };
    }
  }

  // Try to detect Positions if ANY per-tab header set matches on ANY sheet
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (POS_HEADER_SETS.some((set) => sheetHasHeaders(sheet, set))) {
      return { kind: 'positions', wb };
    }
  }

  return { kind: 'unknown', wb };
};

// ============================================
// Build Account Name to ID Map
// ============================================

export const buildAccountNameToIdMap = (existingAccounts) => {
  const map = new Map();
  (Array.isArray(existingAccounts) ? existingAccounts : []).forEach(acc => {
    const key = String(acc?.account_name || acc?.name || '').trim().toLowerCase();
    if (key) map.set(key, acc.id);
  });
  return map;
};

// ============================================
// Validate file type
// ============================================

export const isValidExcelFile = (file) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];
  return allowedTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i);
};
