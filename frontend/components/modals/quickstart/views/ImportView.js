// Import View - Excel/CSV import functionality
import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, Upload, Download, FileSpreadsheet, Check,
  AlertCircle, Loader2, ArrowRight, CheckCircle, X
} from 'lucide-react';
import { VIEWS, ASSET_TYPES, ACCOUNT_CATEGORIES, ACCOUNT_TYPES_BY_CATEGORY } from '../utils/constants';

export default function ImportView({
  state,
  dispatch,
  actions,
  accounts,
  goToView,
  goBack
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [accountMapping, setAccountMapping] = useState({});
  const [importType, setImportType] = useState(null); // 'accounts' or 'positions'
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setError(null);
    setPreview(null);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('No data found in file');
      }

      // Detect import type based on headers
      const detectedType = detectImportType(rows[0]);
      setImportType(detectedType);

      // Parse based on type
      if (detectedType === 'accounts') {
        const parsed = parseAccountRows(rows);
        setPreview(parsed);
      } else {
        const parsed = parsePositionRows(rows, accounts);
        setPreview(parsed);
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError(err.message);
    } finally {
      setParsing(false);
    }
  }, [accounts]);

  // Import the data
  const handleImport = useCallback(() => {
    if (!preview) return;

    if (importType === 'accounts') {
      // Import accounts
      preview.items.forEach(account => {
        dispatch(actions.addAccount({
          accountName: account.accountName,
          institution: account.institution,
          accountCategory: account.accountCategory,
          accountType: account.accountType
        }));
      });
      goToView(VIEWS.accounts);
    } else {
      // Import positions with account mapping applied
      const positionsByType = {};

      preview.items.forEach(item => {
        const assetType = item.assetType;
        if (!positionsByType[assetType]) {
          positionsByType[assetType] = [];
        }

        // Apply account mapping if needed
        let accountId = item.data.account_id;
        if (item.unmappedAccount && accountMapping[item.unmappedAccount]) {
          accountId = accountMapping[item.unmappedAccount];
        }

        positionsByType[assetType].push({
          ...item.data,
          account_id: accountId
        });
      });

      // Bulk import all positions
      dispatch(actions.bulkImportPositions(positionsByType));
      goToView(VIEWS.positions);
    }
  }, [preview, importType, accountMapping, dispatch, actions, goToView]);

  // Download template
  const downloadTemplate = useCallback((type) => {
    let csv;
    if (type === 'accounts') {
      const headers = ['Account Name', 'Institution', 'Account Category', 'Account Type'];
      const samples = [
        ['My 401k', 'Fidelity', 'retirement', '401k'],
        ['Brokerage', 'TD Ameritrade', 'investment', 'brokerage'],
        ['Savings', 'Chase', 'cash', 'savings']
      ];
      csv = [headers.join(','), ...samples.map(r => r.join(','))].join('\n');
    } else {
      const headers = ['asset_type', 'account_name', 'ticker', 'symbol', 'shares', 'quantity', 'cost_basis', 'purchase_price', 'purchase_date', 'cash_type', 'amount', 'metal_type', 'asset_name', 'current_value'];
      const samples = [
        ['security', 'My Brokerage', 'AAPL', '', '10', '', '175.00', '', '2024-01-15', '', '', '', '', ''],
        ['crypto', 'Coinbase', '', 'BTC', '', '0.5', '', '60000', '2024-02-01', '', '', '', '', ''],
        ['cash', 'Chase', '', '', '', '', '', '', '', 'Checking', '5000', '', '', ''],
        ['metal', 'Gold Vault', '', '', '', '10', '', '2400', '2024-03-01', '', '', 'Gold', '', ''],
        ['other', '', '', '', '', '', '', '', '', '', '', '', 'My House', '500000']
      ];
      csv = [headers.join(','), ...samples.map(r => r.join(','))].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nestegg-${type}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const resetImport = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    setAccountMapping({});
    setImportType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white">Import from Excel/CSV</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!preview ? (
          // Upload Section
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Template downloads */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => downloadTemplate('accounts')}
                className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">Accounts Template</span>
                </div>
                <p className="text-sm text-gray-400">Download CSV template for bulk account import</p>
              </button>

              <button
                onClick={() => downloadTemplate('positions')}
                className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">Positions Template</span>
                </div>
                <p className="text-sm text-gray-400">Download CSV template for bulk position import</p>
              </button>
            </div>

            {/* File upload area */}
            <div
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all
                ${error ? 'border-rose-500/50 bg-rose-500/5' : 'border-gray-700 hover:border-gray-600'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-xl">
                  {parsing ? (
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                <div>
                  <p className="text-lg font-medium text-white mb-1">
                    {parsing ? 'Parsing file...' : 'Upload your file'}
                  </p>
                  <p className="text-sm text-gray-400">
                    CSV or Excel files supported
                  </p>
                </div>

                {!parsing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Choose File
                  </button>
                )}

                {file && !parsing && (
                  <p className="text-sm text-gray-400">
                    Selected: {file.name}
                  </p>
                )}

                {error && (
                  <div className="flex items-center justify-center space-x-2 text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="font-medium text-white mb-2">File Format Requirements</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>First row should contain column headers</li>
                <li>For accounts: Account Name, Institution, Account Category, Account Type</li>
                <li>For positions: asset_type, ticker/symbol, shares/quantity, cost_basis/purchase_price</li>
                <li>Account names will be matched to your existing accounts</li>
                <li>Use the templates above for the correct format</li>
              </ul>
            </div>
          </div>
        ) : (
          // Preview Section
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Preview: {preview.items?.length || 0} {importType === 'accounts' ? 'accounts' : 'positions'} found
                </h3>
                <p className="text-sm text-gray-400">
                  Review the data below before importing
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetImport}
                  className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
                >
                  Upload Different File
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Import {preview.items?.length || 0} Items</span>
                </button>
              </div>
            </div>

            {/* Unmapped accounts warning */}
            {preview.unmappedAccounts?.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-300 mb-2">
                      Account Mapping Required
                    </h4>
                    <p className="text-sm text-amber-400/80 mb-3">
                      Some account names in your file couldn't be matched. Please map them below:
                    </p>
                    <div className="space-y-2">
                      {preview.unmappedAccounts.map((name) => (
                        <div key={name} className="flex items-center space-x-3 bg-gray-800 p-3 rounded">
                          <span className="text-sm text-gray-300 flex-1">"{name}"</span>
                          <ArrowRight className="w-4 h-4 text-gray-600" />
                          <select
                            value={accountMapping[name] || ''}
                            onChange={(e) => setAccountMapping(prev => ({
                              ...prev,
                              [name]: parseInt(e.target.value)
                            }))}
                            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm [&>option]:bg-gray-800"
                          >
                            <option value="">Select account...</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.account_name || acc.name} ({acc.institution || 'Unknown'})
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr>
                      {importType === 'accounts' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Account Name</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Institution</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Type</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Ticker/Symbol</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Cost</th>
                          <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Account</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {preview.items?.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/50">
                        {importType === 'accounts' ? (
                          <>
                            <td className="px-4 py-3 text-white">{item.accountName}</td>
                            <td className="px-4 py-3 text-gray-300">{item.institution}</td>
                            <td className="px-4 py-3 text-gray-400">{item.accountCategory}</td>
                            <td className="px-4 py-3 text-gray-400">{item.accountType}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-gray-400">
                              {ASSET_TYPES[item.assetType]?.name || item.assetType}
                            </td>
                            <td className="px-4 py-3 text-white">
                              {item.data.ticker || item.data.symbol || item.data.asset_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {item.data.shares || item.data.quantity || item.data.amount || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-300">
                              {item.data.cost_basis || item.data.purchase_price || item.data.current_value || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              {item.unmappedAccount ? (
                                <span className="text-amber-400">{item.unmappedAccount}</span>
                              ) : (
                                accounts.find(a => a.id === item.data.account_id)?.account_name || '-'
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.items?.length > 50 && (
                <div className="px-4 py-2 bg-gray-800 text-center text-sm text-gray-400">
                  Showing 50 of {preview.items.length} items
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700">
        <button
          onClick={goBack}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

// CSV Parser
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Handle quoted fields with commas
  const parseRow = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

// Detect import type from headers
function detectImportType(headers) {
  const headerKeys = Object.keys(headers).map(k => k.toLowerCase());

  // Account indicators
  const accountIndicators = ['account_name', 'account_category', 'account_type'];
  const hasAccountHeaders = accountIndicators.some(ind =>
    headerKeys.some(h => h.includes(ind))
  );

  // Position indicators
  const positionIndicators = ['ticker', 'symbol', 'shares', 'quantity', 'asset_type'];
  const hasPositionHeaders = positionIndicators.some(ind =>
    headerKeys.some(h => h.includes(ind))
  );

  if (hasAccountHeaders && !hasPositionHeaders) {
    return 'accounts';
  }

  return 'positions';
}

// Parse account rows
function parseAccountRows(rows) {
  const items = rows.map(row => ({
    accountName: row.account_name || row.accountname || row.name || '',
    institution: row.institution || row.bank || row.broker || '',
    accountCategory: normalizeCategory(row.account_category || row.category || ''),
    accountType: row.account_type || row.type || ''
  })).filter(item => item.accountName);

  return { items, unmappedAccounts: [] };
}

// Parse position rows
function parsePositionRows(rows, existingAccounts) {
  const items = [];
  const unmappedAccountSet = new Set();

  rows.forEach((row) => {
    // Determine asset type
    let assetType = 'security';
    const rowType = (row.asset_type || row.type || '').toLowerCase();

    if (rowType === 'crypto' || rowType === 'cryptocurrency' || row.crypto) {
      assetType = 'crypto';
    } else if (rowType === 'metal' || row.metal_type) {
      assetType = 'metal';
    } else if (rowType === 'cash' || row.cash_type) {
      assetType = 'cash';
    } else if (rowType === 'other' || row.asset_name) {
      assetType = 'other';
    }

    // Find account
    let accountId = null;
    let unmappedAccount = null;
    const accountName = row.account_name || row.account || '';

    if (accountName) {
      const match = existingAccounts.find(acc =>
        (acc.account_name || acc.name || '').toLowerCase() === accountName.toLowerCase() ||
        `${acc.account_name || acc.name} ${acc.institution || ''}`.toLowerCase().includes(accountName.toLowerCase())
      );

      if (match) {
        accountId = match.id;
      } else {
        unmappedAccount = accountName;
        unmappedAccountSet.add(accountName);
      }
    }

    // Build position data
    const data = {
      account_id: accountId,
      purchase_date: row.purchase_date || row.date || new Date().toISOString().split('T')[0]
    };

    if (assetType === 'security') {
      data.ticker = (row.ticker || row.symbol || '').toUpperCase();
      data.shares = parseFloat(row.shares || row.quantity || 0);
      data.cost_basis = parseFloat(row.cost_basis || row.price || 0);
    } else if (assetType === 'crypto') {
      data.symbol = (row.symbol || row.ticker || '').toUpperCase();
      data.quantity = parseFloat(row.quantity || row.shares || 0);
      data.purchase_price = parseFloat(row.purchase_price || row.cost_basis || row.price || 0);
    } else if (assetType === 'cash') {
      data.cash_type = row.cash_type || 'Savings';
      data.amount = parseFloat(row.amount || row.quantity || 0);
    } else if (assetType === 'metal') {
      data.metal_type = row.metal_type || 'Gold';
      data.quantity = parseFloat(row.quantity || 0);
      data.purchase_price = parseFloat(row.purchase_price || row.price || 0);
    } else if (assetType === 'other') {
      data.asset_name = row.asset_name || row.name || '';
      data.current_value = parseFloat(row.current_value || row.value || 0);
    }

    items.push({ assetType, data, unmappedAccount });
  });

  return {
    items,
    unmappedAccounts: Array.from(unmappedAccountSet)
  };
}

// Normalize category
function normalizeCategory(category) {
  const cat = category.toLowerCase();
  if (cat.includes('invest') || cat.includes('brokerage')) return 'investment';
  if (cat.includes('retire') || cat.includes('401') || cat.includes('ira')) return 'retirement';
  if (cat.includes('cash') || cat.includes('bank') || cat.includes('check') || cat.includes('sav')) return 'cash';
  if (cat.includes('crypto')) return 'crypto';
  return 'other';
}
