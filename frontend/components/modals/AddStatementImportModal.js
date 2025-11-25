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
import { addSecurityPositionBulk } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';
import {
  Upload, X, Check, AlertCircle, FileSpreadsheet, ChevronDown,
  Download, Building2, CheckCircle, Loader2, ArrowRight, Settings,
  Info, AlertTriangle, Trash2, Eye, EyeOff, RefreshCw, File
} from 'lucide-react';
import toast from 'react-hot-toast';

// Parse Excel/CSV file
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

// Column mapping interface
const ColumnMappingUI = ({ parsedData, mappings, onMappingChange, detectedInstitution }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);

  const requiredFields = ['symbol', 'quantity', 'purchasePrice'];
  const optionalFields = ['currentValue', 'description', 'purchaseDate', 'costBasis'];
  const allFields = [...requiredFields, ...optionalFields];

  const availableColumns = parsedData[0]?.headers || [];
  const displayFields = showAllColumns ? allFields : requiredFields;

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

  return (
    <div className="space-y-4">
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

  const steps = [
    { id: 'upload', label: 'Upload', sublabel: 'Select files', icon: Upload },
    { id: 'map', label: 'Map Columns', sublabel: 'Configure fields', icon: Settings },
    { id: 'account', label: 'Select Account', sublabel: 'Choose destination', icon: Building2 },
    { id: 'review', label: 'Review', sublabel: 'Confirm & import', icon: CheckCircle }
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
      accountTypes: accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))
    });

    const filtered = accounts.filter(acc => {
      // Use 'type' field (not 'account_type') as returned by useAccounts hook
      const accountType = (acc?.type || '').toLowerCase();
      const isMatch = (
        accountType === 'brokerage' ||
        accountType === 'retirement' ||
        accountType === 'cryptocurrency'
      );

      console.log('[AddStatementImportModal] Account filter:', {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        accountType,
        isMatch
      });

      return isMatch;
    });

    console.log('[AddStatementImportModal] Filtered accounts:', {
      filteredCount: filtered.length,
      filteredAccounts: filtered.map(a => ({ id: a.id, name: a.name, type: a.type }))
    });

    return filtered;
  }, [existingAccounts]);

  // Handle file selection
  const handleFilesSelected = async (selectedFiles) => {
    setIsProcessing(true);
    try {
      const parsed = await Promise.all(selectedFiles.map(parseFile));
      setFiles(selectedFiles);
      setParsedData(parsed);

      // Auto-detect institution from first file
      if (parsed.length > 0 && parsed[0].data.length > 0) {
        const institution = detectInstitution(parsed[0].data, parsed[0].fileName);
        setDetectedInstitution(institution);

        // Auto-map columns
        const autoMapped = autoMapColumns(parsed[0].headers, institution);
        setColumnMappings(autoMapped);

        if (institution) {
          toast.success(`Detected ${INSTITUTION_TEMPLATES[institution].name} format`);
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

  const handleRemoveFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newParsedData = parsedData.filter((_, i) => i !== index);
    setFiles(newFiles);
    setParsedData(newParsedData);

    if (newFiles.length === 0) {
      setCurrentStep(0);
      setColumnMappings({});
      setDetectedInstitution(null);
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

  const handleImport = async () => {
    if (!selectedAccount) {
      toast.error('Please select an account');
      return;
    }

    setIsProcessing(true);

    try {
      // Aggregate all positions from all files
      const allPositions = [];

      for (const fileData of parsedData) {
        for (const row of fileData.data) {
          const position = {
            ticker: row[columnMappings.symbol],
            shares: parseFloat(row[columnMappings.quantity]) || 0,
            purchase_price: parseFloat(row[columnMappings.purchasePrice]) || 0,
            purchase_date: row[columnMappings.purchaseDate] || new Date().toISOString().split('T')[0],
            account_id: selectedAccount
          };

          // Skip empty rows
          if (position.ticker && position.shares > 0) {
            allPositions.push(position);
          }
        }
      }

      // Import in bulk
      const result = await addSecurityPositionBulk(selectedAccount, allPositions);

      setImportResults({
        success: true,
        total: allPositions.length,
        imported: allPositions.length,
        failed: 0
      });

      toast.success(`Successfully imported ${allPositions.length} positions!`);

      // Wait a moment then close
      setTimeout(() => {
        onClose();
        resetModal();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed. Please try again.');
      setImportResults({
        success: false,
        error: error.message
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
          />
        );

      case 2:
        console.log('[AddStatementImportModal] Rendering step 2 (account selection):', {
          isLoadingAccounts,
          filteredAccountsLength: filteredAccounts.length,
          filteredAccounts: filteredAccounts.map(a => ({ id: a.id, name: a.name, type: a.type }))
        });

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Select the account where these positions will be imported
            </p>
            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="ml-2 text-gray-400">Loading accounts...</span>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No eligible accounts found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Create a brokerage, retirement, or crypto account first
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
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
        const totalPositions = parsedData.reduce((sum, file) => sum + file.data.length, 0);
        const selectedAccountData = filteredAccounts.find(a => a.id === selectedAccount);
        // Use 'name' field from useAccounts hook
        const selectedAccountName = selectedAccountData?.name;

        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Files</p>
                <p className="text-2xl font-bold text-white">{files.length}</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Positions</p>
                <p className="text-2xl font-bold text-white">{totalPositions}</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Account</p>
                <p className="text-sm font-medium text-white truncate">
                  {selectedAccountName}
                </p>
              </div>
            </div>

            {/* Preview */}
            <PreviewTable
              data={parsedData[0]?.data || []}
              mappings={columnMappings}
              limit={5}
            />

            {/* Warning */}
            <div className="flex items-start space-x-3 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-300">
                  Review before importing
                </p>
                <p className="text-xs text-yellow-400/70 mt-1">
                  This will add {totalPositions} positions to {selectedAccountName}.
                  Make sure the column mappings are correct.
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
                        Import successful!
                      </p>
                      <p className="text-xs text-green-400/70 mt-1">
                        Imported {importResults.imported} of {importResults.total} positions
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-300">
                        Import failed
                      </p>
                      <p className="text-xs text-red-400/70 mt-1">
                        {importResults.error}
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
      title="Import Statement"
      subtitle="Upload and import positions from bank or brokerage statements"
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
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 0 && files.length === 0) ||
                  (currentStep === 1 && !canProceedToAccount()) ||
                  (currentStep === 2 && !canProceedToReview())
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Continue</span>
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
                    <span>Importing...</span>
                  </>
                ) : importResults?.success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Imported!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Import Positions</span>
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
export const QuickStatementImportButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 transition-all duration-200"
      >
        <Upload className="w-4 h-4" />
        <span>Import Statement</span>
      </button>
      <AddStatementImportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default AddStatementImportModal;
