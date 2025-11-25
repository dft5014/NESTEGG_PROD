// Import View - Excel/CSV import functionality
// Complete workflow matching original QuickStartModal
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Upload, Download, FileSpreadsheet, Check, FolderOpen,
  AlertCircle, Loader2, ArrowRight, CheckCircle, X, Table, ListPlus,
  Star, Zap, MousePointer, Keyboard, Import, Copy, Info
} from 'lucide-react';
import { VIEWS, ASSET_TYPES, ACCOUNT_CATEGORIES, ACCOUNT_TYPES_BY_CATEGORY } from '../utils/constants';
import {
  downloadTemplate,
  parsePositionsExcel,
  parseAccountsExcel,
  detectTemplateType,
  buildAccountNameToIdMap,
  isValidExcelFile
} from '../utils/excelUtils';

export default function ImportView({
  state,
  dispatch,
  actions,
  accounts, // existing accounts from DataStore
  goToView,
  goBack,
  importTarget // 'accounts' or 'positions' - which type we're importing for
}) {
  // Import workflow state
  const [step, setStep] = useState('choice'); // 'choice' | 'template' | 'upload' | 'preview'
  const [importMethod, setImportMethod] = useState(null); // 'ui' | 'excel'
  const [selectedTemplate, setSelectedTemplate] = useState(importTarget || null);

  // File handling state
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Parsed data
  const [parsedAccounts, setParsedAccounts] = useState([]);
  const [parsedPositions, setParsedPositions] = useState({ security: [], cash: [], crypto: [], metal: [] });
  const [unmappedAccounts, setUnmappedAccounts] = useState([]);

  const fileInputRef = useRef(null);

  // Build account name to ID map for position imports
  const accountNameToId = useMemo(() => buildAccountNameToIdMap(accounts), [accounts]);

  // Handle template download
  const handleDownloadTemplate = useCallback(async (type) => {
    try {
      await downloadTemplate(type, setIsDownloading);
    } catch (error) {
      console.error('Download failed:', error);
      // Could show toast notification here
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    if (!isValidExcelFile(selectedFile)) {
      setParseError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setValidationStatus('validating');
    setUploadProgress(0);

    try {
      // Detect template type
      setUploadProgress(25);
      const { kind } = await detectTemplateType(selectedFile);

      if (kind === 'unknown') {
        throw new Error('Could not detect template type. Please use the official NestEgg template.');
      }

      setUploadProgress(50);

      if (kind === 'accounts') {
        setSelectedTemplate('accounts');
        const parsed = await parseAccountsExcel(selectedFile, ACCOUNT_CATEGORIES);
        setParsedAccounts(parsed);
        setUploadProgress(100);
        setValidationStatus('success');
        setStep('preview');
      } else if (kind === 'positions') {
        setSelectedTemplate('positions');
        const parsed = await parsePositionsExcel(selectedFile, accountNameToId);
        setParsedPositions(parsed);

        // Find unmapped accounts
        const unmapped = new Set();
        Object.values(parsed).forEach(typeArray => {
          typeArray.forEach(item => {
            if (item.data.account_name && !item.data.account_id) {
              unmapped.add(item.data.account_name);
            }
          });
        });
        setUnmappedAccounts(Array.from(unmapped));

        setUploadProgress(100);
        setValidationStatus('success');
        setStep('preview');
      }
    } catch (error) {
      console.error('Parse error:', error);
      setParseError(error.message || 'Failed to parse file');
      setValidationStatus('error');
    } finally {
      setIsParsing(false);
    }
  }, [accountNameToId]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  // Import the parsed data
  const handleImport = useCallback(() => {
    if (selectedTemplate === 'accounts' && parsedAccounts.length > 0) {
      // Bulk import accounts
      parsedAccounts.forEach(account => {
        dispatch(actions.addAccount({
          accountName: account.accountName,
          institution: account.institution,
          accountCategory: account.accountCategory,
          accountType: account.accountType
        }));
      });
      goToView(VIEWS.accounts);
    } else if (selectedTemplate === 'positions') {
      // Bulk import positions
      dispatch(actions.bulkImportPositions(parsedPositions));
      goToView(VIEWS.positions);
    }
  }, [selectedTemplate, parsedAccounts, parsedPositions, dispatch, actions, goToView]);

  // Reset import state
  const resetImport = useCallback(() => {
    setFile(null);
    setParseError(null);
    setValidationStatus(null);
    setUploadProgress(0);
    setParsedAccounts([]);
    setParsedPositions({ security: [], cash: [], crypto: [], metal: [] });
    setUnmappedAccounts([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Go directly to UI mode
  const handleUIMode = useCallback(() => {
    if (importTarget === 'accounts') {
      goToView(VIEWS.accounts);
    } else {
      goToView(VIEWS.positions);
    }
  }, [importTarget, goToView]);

  // Calculate totals for preview
  const positionTotals = useMemo(() => {
    const totals = { total: 0, security: 0, cash: 0, crypto: 0, metal: 0 };
    Object.entries(parsedPositions).forEach(([type, items]) => {
      totals[type] = items.length;
      totals.total += items.length;
    });
    return totals;
  }, [parsedPositions]);

  // Render import method choice (UI vs Excel)
  const renderImportChoice = () => {
    const isAccounts = importTarget === 'accounts';
    const color = isAccounts ? 'blue' : 'purple';
    const Icon = isAccounts ? ListPlus : FileSpreadsheet;
    const title = isAccounts ? 'Add Accounts' : 'Add Positions';

    return (
      <div className="space-y-6 animate-fadeIn p-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-full mb-4`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-300 max-w-md mx-auto">
            Choose how you'd like to add your {isAccounts ? 'accounts' : 'positions'}
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-4">
          {/* UI Option */}
          <div
            className={`md:col-span-7 group relative bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-emerald-800/50`}
            onClick={handleUIMode}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-900/50 rounded-full mb-4 group-hover:bg-emerald-800 transition-colors">
                <ListPlus className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300" />
              </div>
              <div className="inline-flex items-center px-2 py-1 bg-emerald-900/40 text-emerald-300 text-xs font-semibold rounded-full mb-3 border border-emerald-700">
                <Star className="w-3 h-3 mr-1" />
                Recommended
              </div>
              <h4 className="text-xl font-semibold text-white group-hover:text-emerald-300 mb-2 transition-colors">
                Quick Add UI
              </h4>
              <p className="text-gray-300 group-hover:text-emerald-100 text-sm transition-colors mb-4">
                Add {isAccounts ? 'accounts' : 'positions'} directly in the browser with our intuitive form
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-emerald-400 group-hover:text-emerald-200 text-sm transition-colors">
                  <Zap className="w-4 h-4 mr-2" />
                  <span>Fastest method</span>
                </div>
                <div className="flex items-center text-emerald-400 group-hover:text-emerald-200 text-sm transition-colors">
                  <MousePointer className="w-4 h-4 mr-2" />
                  <span>No file downloads needed</span>
                </div>
                <div className="flex items-center text-emerald-400 group-hover:text-emerald-200 text-sm transition-colors">
                  <Keyboard className="w-4 h-4 mr-2" />
                  <span>Keyboard shortcuts supported</span>
                </div>
              </div>
            </div>
          </div>

          {/* Excel Option */}
          <div
            className={`md:col-span-5 group relative bg-gradient-to-br from-${color}-900/30 to-${color}-800/30 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-${color}-800/50`}
            onClick={() => setStep('template')}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-${color}-600 to-${color}-700 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
            <div className="relative z-10">
              <div className={`flex items-center justify-center w-12 h-12 bg-${color}-900/50 rounded-full mb-4 group-hover:bg-${color}-800 transition-colors`}>
                <Table className={`w-6 h-6 text-${color}-400 group-hover:text-${color}-300`} />
              </div>
              <h4 className={`text-xl font-semibold text-white group-hover:text-${color}-300 mb-2 transition-colors`}>
                Excel Import
              </h4>
              <p className={`text-gray-300 group-hover:text-${color}-100 text-sm transition-colors mb-4`}>
                Download a template and upload your completed spreadsheet
              </p>
              <div className="space-y-2">
                <div className={`flex items-center text-${color}-400 group-hover:text-${color}-200 text-sm transition-colors`}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  <span>Work offline</span>
                </div>
                <div className={`flex items-center text-${color}-400 group-hover:text-${color}-200 text-sm transition-colors`}>
                  <Import className="w-4 h-4 mr-2" />
                  <span>Bulk import many {isAccounts ? 'accounts' : 'positions'}</span>
                </div>
                <div className={`flex items-center text-${color}-400 group-hover:text-${color}-200 text-sm transition-colors`}>
                  <Copy className="w-4 h-4 mr-2" />
                  <span>Copy/paste from existing data</span>
                </div>
              </div>
            </div>

            {/* Direct upload shortcut */}
            <div className="mt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStep('upload');
                }}
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 underline"
              >
                I already have a filled template — Upload now
              </button>
            </div>
          </div>
        </div>

        <div className={`bg-${color}-900/20 border border-${color}-800/50 rounded-lg p-4`}>
          <div className="flex items-center">
            <Star className={`w-5 h-5 text-${color}-400 mr-3 flex-shrink-0`} />
            <p className={`text-sm text-${color}-200`}>
              <span className="font-medium">Pro tip:</span> Use the Quick Add UI for a few {isAccounts ? 'accounts' : 'positions'}, or Excel Import for 10+ {isAccounts ? 'accounts' : 'positions'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render template download section
  const renderTemplateSection = () => {
    const type = selectedTemplate || importTarget || 'positions';
    const isAccounts = type === 'accounts';
    const color = isAccounts ? 'blue' : 'purple';

    return (
      <div className="space-y-6 animate-fadeIn p-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-full mb-4`}>
            <Download className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Download {isAccounts ? 'Accounts' : 'Positions'} Template
          </h3>
          <p className="text-gray-300 max-w-md mx-auto">
            {isAccounts
              ? 'Download the template and fill in your account information'
              : 'Add your investment positions to your existing accounts'}
          </p>
        </div>

        {!isAccounts && (
          <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-purple-400 mr-3 flex-shrink-0" />
              <p className="text-sm text-purple-300">
                Make sure you've imported your accounts first. The positions template will include your account names.
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-6">
          <h4 className="font-semibold text-white mb-4">How it works:</h4>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 bg-${color}-900/50 rounded-full flex items-center justify-center mr-3`}>
                <span className={`text-sm font-semibold text-${color}-400`}>1</span>
              </div>
              <div>
                <p className="font-medium text-white">Download the Excel template</p>
                <p className="text-sm text-gray-300 mt-1">
                  {isAccounts
                    ? 'Pre-formatted with dropdowns for institutions and account types'
                    : 'Customized with your account names for easy selection'}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 bg-${color}-900/50 rounded-full flex items-center justify-center mr-3`}>
                <span className={`text-sm font-semibold text-${color}-400`}>2</span>
              </div>
              <div>
                <p className="font-medium text-white">Fill in your information</p>
                <p className="text-sm text-gray-300 mt-1">
                  {isAccounts
                    ? 'Add your account names, institutions, and types'
                    : 'Enter your securities, quantities, and purchase details'}
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 bg-${color}-900/50 rounded-full flex items-center justify-center mr-3`}>
                <span className={`text-sm font-semibold text-${color}-400`}>3</span>
              </div>
              <div>
                <p className="font-medium text-white">Upload the completed template</p>
                <p className="text-sm text-gray-300 mt-1">We'll validate your data and import everything automatically</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => handleDownloadTemplate(type)}
            disabled={isDownloading}
            className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-${color}-600 to-${color}-700 text-white font-medium rounded-lg hover:from-${color}-700 hover:to-${color}-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download {isAccounts ? 'Accounts' : 'Positions'} Template
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStep('upload')}
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 underline"
          >
            I already have a filled template — Upload now
          </button>
        </div>
      </div>
    );
  };

  // Render upload section
  const renderUploadSection = () => (
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4">
          <Upload className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Upload Completed Template</h3>
        <p className="text-gray-300 max-w-md mx-auto">
          Upload your filled template for validation
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging ? 'border-purple-400 bg-purple-900/20' :
          parseError ? 'border-rose-500/50 bg-rose-900/10' :
          'border-gray-700'
        }`}
      >
        <div className="mb-4">
          {isParsing ? (
            <Loader2 className="w-8 h-8 text-purple-400 inline-block animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400 inline-block" />
          )}
        </div>
        <p className="text-gray-300 mb-2">
          {isParsing ? 'Parsing file...' : 'Drag and drop your Excel file'}
        </p>
        <p className="text-xs text-gray-400 mb-4">.xlsx, .xls, or .csv</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile);
            if (e.target) e.target.value = '';
          }}
        />

        {!isParsing && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Browse Files
          </button>
        )}

        {/* Show selected file */}
        {file && !isParsing && (
          <div className="mt-4 flex items-center justify-center space-x-3">
            <span className="text-sm text-gray-300">
              Selected: <span className="font-medium">{file.name}</span>
            </span>
            <button
              type="button"
              onClick={resetImport}
              className="text-sm text-gray-400 hover:text-gray-200 underline"
            >
              Remove
            </button>
          </div>
        )}

        {/* Progress / Status */}
        {validationStatus === 'validating' && (
          <div className="mt-4 text-sm text-gray-300">
            Validating... {uploadProgress}%
          </div>
        )}

        {/* Error Panel */}
        {parseError && (
          <div className="mt-6 bg-rose-900/20 border border-rose-500/30 rounded-xl p-5 text-left">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-rose-300 font-semibold mb-1">Import Failed</h4>
                <p className="text-rose-200/80 text-sm mb-3">{parseError}</p>

                <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">Common causes:</p>
                  <ul className="text-xs text-gray-400 space-y-1.5">
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <span>File is not from the official NestEgg template</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <span>Required columns are missing or renamed</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <span>File is corrupted or in an unsupported format</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <span>Data contains invalid characters or formatting</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={resetImport}
                    className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-sm rounded-lg transition-colors"
                  >
                    Try Another File
                  </button>
                  <button
                    onClick={() => setStep('template')}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    Download Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download templates from here too */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleDownloadTemplate('accounts')}
          disabled={isDownloading}
          className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all text-left group"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Download className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white">Accounts Template</span>
          </div>
          <p className="text-sm text-gray-400">Download Excel template for bulk account import</p>
        </button>

        <button
          onClick={() => handleDownloadTemplate('positions')}
          disabled={isDownloading}
          className="p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-all text-left group"
        >
          <div className="flex items-center space-x-3 mb-2">
            <Download className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-white">Positions Template</span>
          </div>
          <p className="text-sm text-gray-400">Download Excel template for bulk position import</p>
        </button>
      </div>
    </div>
  );

  // Render preview section
  const renderPreviewSection = () => {
    const isAccounts = selectedTemplate === 'accounts';
    const items = isAccounts ? parsedAccounts : Object.values(parsedPositions).flat();
    const itemCount = items.length;

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Preview: {itemCount} {isAccounts ? 'accounts' : 'positions'} found
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
                disabled={itemCount === 0}
                className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Import {itemCount} Items</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unmapped accounts warning */}
        {!isAccounts && unmappedAccounts.length > 0 && (
          <div className="flex-shrink-0 mx-4 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-300 mb-2">
                  Some Accounts Not Found
                </h4>
                <p className="text-sm text-amber-400/80 mb-2">
                  These account names from your file couldn't be matched to existing accounts:
                </p>
                <div className="flex flex-wrap gap-2">
                  {unmappedAccounts.map(name => (
                    <span key={name} className="px-2 py-1 bg-amber-900/30 text-amber-300 rounded text-xs">
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-400/60 mt-2">
                  You can create these accounts first, or select the correct account after import.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats for positions */}
        {!isAccounts && (
          <div className="flex-shrink-0 mx-4 mt-4 bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{positionTotals.total}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{positionTotals.security}</p>
                <p className="text-xs text-gray-400">Securities</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{positionTotals.cash}</p>
                <p className="text-xs text-gray-400">Cash</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{positionTotals.crypto}</p>
                <p className="text-xs text-gray-400">Crypto</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{positionTotals.metal}</p>
                <p className="text-xs text-gray-400">Metals</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr>
                    {isAccounts ? (
                      <>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Account Name</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Institution</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Type</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Symbol</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Cost</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Account</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {isAccounts ? (
                    parsedAccounts.slice(0, 50).map((account, idx) => (
                      <tr key={account.id || idx} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-white">{account.accountName}</td>
                        <td className="px-4 py-3 text-gray-300">{account.institution}</td>
                        <td className="px-4 py-3 text-gray-400">{account.accountCategory}</td>
                        <td className="px-4 py-3 text-gray-400">{account.accountType}</td>
                        <td className="px-4 py-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    items.slice(0, 50).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-gray-400 capitalize">{item.type}</td>
                        <td className="px-4 py-3 text-white">
                          {item.data.ticker || item.data.symbol || item.data.cash_type || item.data.metal_type || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {item.data.shares || item.data.quantity || item.data.amount || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {item.data.cost_basis || item.data.purchase_price || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {item.data.account_id ? (
                            accounts.find(a => a.id === item.data.account_id)?.account_name || item.data.account_name
                          ) : (
                            <span className="text-amber-400">{item.data.account_name || 'Not mapped'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.data.account_id ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 50 && (
              <div className="px-4 py-2 bg-gray-800 text-center text-sm text-gray-400">
                Showing 50 of {items.length} items
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (step === 'preview') {
                  resetImport();
                } else if (step === 'upload' || step === 'template') {
                  setStep('choice');
                } else {
                  goBack();
                }
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {step === 'choice' ? `Add ${importTarget === 'accounts' ? 'Accounts' : 'Positions'}` :
               step === 'template' ? 'Download Template' :
               step === 'upload' ? 'Upload File' :
               'Preview Import'}
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {step === 'choice' && renderImportChoice()}
        {step === 'template' && renderTemplateSection()}
        {step === 'upload' && renderUploadSection()}
        {step === 'preview' && renderPreviewSection()}
      </div>

      {/* Footer */}
      {step !== 'preview' && (
        <div className="flex-shrink-0 p-4 border-t border-gray-700">
          <button
            onClick={() => {
              if (step === 'upload' || step === 'template') {
                setStep('choice');
              } else {
                goBack();
              }
            }}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
