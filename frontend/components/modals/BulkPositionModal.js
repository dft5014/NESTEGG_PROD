// components/modals/BulkPositionModal.js
import { useState, useEffect } from "react";
import { fetchWithAuth } from '@/utils/api';
import FixedModal from './FixedModal';

/**
 * A reusable modal component for bulk uploading positions
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Array} props.accounts - Array of accounts
 * @param {Function} props.onSuccess - Callback function on successful upload
 * @param {Function} props.fetchAccounts - Function to refresh accounts data
 * @param {Function} props.fetchPositions - Function to refresh positions data
 * @param {Function} props.fetchPortfolioSummary - Function to refresh portfolio summary
 */
const BulkPositionModal = ({ 
  isOpen, 
  onClose, 
  accounts, 
  onSuccess, 
  fetchAccounts, 
  fetchPositions, 
  fetchPortfolioSummary 
}) => {
  // State variables
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [bulkData, setBulkData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "error" or "success"

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedAccount(null);
      setBulkData("");
      setFormMessage("");
      setMessageType("");
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Function to parse bulk data for preview
  const getParsedBulkData = () => {
    if (!bulkData.trim()) return [];
    
    const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
    const parsedData = [];
    
    for (const line of lines) {
      // Try to determine delimiter
      let row;
      if (line.includes('\t')) {
        row = line.split('\t');
      } else if (line.includes(',')) {
        row = line.split(',');
      } else if (line.includes(';')) {
        row = line.split(';');
      } else {
        // Use spaces as last resort, but this might be unreliable
        row = line.split(/\s+/);
      }
      
      // If we have at least some data, add it to the parsed results
      if (row.length >= 1) {
        // Ensure we always have 5 columns
        while (row.length < 5) row.push('');
        parsedData.push(row.slice(0, 5).map(item => item.trim()));
      }
    }
    
    return parsedData;
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!bulkData.trim() || !selectedAccount) {
      setFormMessage("Please paste data to upload");
      setMessageType("error");
      return;
    }
    
    setIsProcessing(true);
    setFormMessage("");
    
    // Handle Excel-style paste with various possible delimiters
    // Split by newlines first
    const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const line of lines) {
        // Try to determine delimiter (tab, comma, or even semicolon which Excel might use)
        let row;
        if (line.includes('\t')) {
          row = line.split('\t');
        } else if (line.includes(',')) {
          row = line.split(',');
        } else if (line.includes(';')) {
          row = line.split(';');
        } else {
          // Can't determine delimiter, skip line
          errorCount++;
          continue;
        }
        
        // Skip if we don't have at least 5 columns
        if (row.length < 5) {
          errorCount++;
          continue;
        }
        
        const [ticker, shares, price, costBasis, purchaseDate] = row.map(item => item.trim());
        
        // Validate data
        if (!ticker || isNaN(parseFloat(shares)) || isNaN(parseFloat(price)) || 
            isNaN(parseFloat(costBasis)) || !purchaseDate) {
          errorCount++;
          continue;
        }
        
        try {
          // Parse date in case it's in a different format
          let formattedDate = purchaseDate;
          
          // Try to handle common date formats from Excel
          if (purchaseDate.includes('/')) {
            const parts = purchaseDate.split('/');
            // Assuming MM/DD/YYYY format
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              formattedDate = `${year}-${month}-${day}`;
            }
          }
          
          const response = await fetchWithAuth(`/positions/${selectedAccount.id}`, {
            method: "POST",
            body: JSON.stringify({
              ticker: ticker.toUpperCase(),
              shares: parseFloat(shares),
              price: parseFloat(price),
              cost_basis: parseFloat(costBasis),
              purchase_date: formattedDate
            }),
          });
          
          if (response.ok) {
            successCount++;
          } else {
            console.log(`Failed to add position: ${ticker}, ${shares}, ${price}, ${costBasis}, ${formattedDate}`);
            errorCount++;
          }
        } catch (error) {
          console.error("Error adding position:", error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setFormMessage(`Successfully uploaded ${successCount} positions${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setMessageType("success");
        
        // Refresh data
        if (fetchAccounts) fetchAccounts();
        if (fetchPositions && selectedAccount) fetchPositions(selectedAccount.id);
        if (fetchPortfolioSummary) fetchPortfolioSummary();
        
        // Call success callback
        if (onSuccess) onSuccess(successCount, errorCount);
        
        // Close modal after successful upload
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setFormMessage(`Failed to upload positions. Please check your data format.`);
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error in bulk upload:", error);
      setFormMessage("Error uploading positions");
      setMessageType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setStep(1);
    setSelectedAccount(null);
    setBulkData("");
    setFormMessage("");
    onClose();
  };

  if (!isOpen) return null;

  // Step 1: Select Account content
  const renderAccountSelection = () => (
    <>
      <h2 className="modal-title">Bulk Upload Positions</h2>
      <p className="mb-4 text-gray-600">Select an account to bulk upload positions:</p>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => {
              setSelectedAccount(account);
              setStep(2);
            }}
            className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{account.account_name}</p>
              <p className="text-sm text-gray-500">{account.institution || "N/A"} • {account.type || "N/A"}</p>
            </div>
            <div className="text-blue-600">
              Select →
            </div>
          </button>
        ))}
      </div>
      
      <div className="modal-buttons mt-4">
        <button
          onClick={handleClose}
          className="modal-cancel"
        >
          Cancel
        </button>
      </div>
    </>
  );

  // Step 2: Paste Data content
  const renderDataUpload = () => (
    <>
      <h2 className="modal-title">Bulk Upload to {selectedAccount.account_name}</h2>
      
      <div className="mb-4">
        <p className="mb-2 text-gray-600">Copy and paste directly from Excel or a spreadsheet.</p>
        
        {/* Data Input Area */}
        <div className="mb-4">
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="Paste your data here..."
            className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
          />
        </div>
        
        {/* Data Preview Grid */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Data Preview:</h3>
          <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {/* Header Row */}
            <div className="grid grid-cols-5 gap-2 bg-gray-100 p-2 sticky top-0">
              <div className="text-xs font-bold">Ticker</div>
              <div className="text-xs font-bold">Shares</div>
              <div className="text-xs font-bold">Price ($)</div>
              <div className="text-xs font-bold">Cost Per Share ($)</div>
              <div className="text-xs font-bold">Purchase Date</div>
            </div>
            
            {/* Data Rows */}
            {getParsedBulkData().length > 0 ? (
              getParsedBulkData().map((row, rowIndex) => (
                <div key={rowIndex} className={`grid grid-cols-5 gap-2 p-2 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="text-xs">{row[0] || ''}</div>
                  <div className="text-xs">{row[1] || ''}</div>
                  <div className="text-xs">{row[2] || ''}</div>
                  <div className="text-xs">{row[3] || ''}</div>
                  <div className="text-xs">{row[4] || ''}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Paste your data above to see a preview here
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm">
        <h4 className="font-medium text-blue-800 mb-2">Import Instructions:</h4>
        <ol className="list-decimal ml-5 text-blue-700 space-y-1">
          <li>Arrange your Excel data in the order: Ticker, Shares, Price, Cost Per Share, Purchase Date</li>
          <li>Select and copy cells from your spreadsheet (Ctrl+C or Cmd+C)</li>
          <li>Paste into the text area above (Ctrl+V or Cmd+V)</li>
          <li>Verify your data in the preview grid below</li>
          <li>Dates can be in MM/DD/YYYY or YYYY-MM-DD format</li>
        </ol>
      </div>
      
      <div className="modal-buttons">
        <button
          onClick={() => handleBulkUpload()}
          className="modal-submit flex items-center justify-center"
          disabled={!bulkData.trim() || isProcessing || getParsedBulkData().length === 0}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            `Upload ${getParsedBulkData().length} Positions`
          )}
        </button>
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleClose}
          className="modal-cancel"
        >
          Cancel
        </button>
      </div>
      
      {formMessage && (
        <p className={`modal-message ${messageType === "error" ? "modal-error" : "modal-success"}`}>
          {formMessage}
        </p>
      )}
    </>
  );

  return (
    <FixedModal 
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? "Bulk Upload Positions" : `Bulk Upload to ${selectedAccount?.account_name}`}
    >
      <div className="max-w-4xl">
        {step === 1 ? renderAccountSelection() : renderDataUpload()}
      </div>
    </FixedModal>
  );
};

export default BulkPositionModal;