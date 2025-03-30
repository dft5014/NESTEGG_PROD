// frontend/components/modals/BulkUploadDataPasteModal.js
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const BulkUploadDataPasteModal = ({ isOpen, onClose, selectedAccount, onUploadComplete, onBack }) => {
  const [bulkData, setBulkData] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse data for preview
   const parsedData = useMemo(() => {
     if (!bulkData.trim()) return [];
     const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
     const data = [];
     for (const line of lines) {
       let row;
       if (line.includes('\t')) row = line.split('\t');
       else if (line.includes(',')) row = line.split(',');
       else if (line.includes(';')) row = line.split(';');
       else row = line.split(/\s+/); // Fallback to space (less reliable)
       
       if (row.length >= 5) { // Expect at least 5 columns
           data.push(row.slice(0, 5).map(item => item.trim()));
       } else if (row.length > 0 && row[0]){ // Include rows with at least one item for preview, even if incomplete
            while (row.length < 5) row.push('');
             data.push(row.slice(0, 5).map(item => item.trim()));
       }
     }
     return data;
   }, [bulkData]);

    // Format date helper (simplified)
    const formatDateForAPI = (dateString) => {
        try {
            // Try parsing common formats like MM/DD/YYYY or YYYY-MM-DD
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                // Format to YYYY-MM-DD
                 const year = date.getFullYear();
                 const month = (date.getMonth() + 1).toString().padStart(2, '0');
                 const day = date.getDate().toString().padStart(2, '0');
                 // Basic validation for year to avoid Excel serial numbers
                 if (year > 1900 && year < 2100) {
                    return `${year}-${month}-${day}`;
                 }
            }
        } catch (e) { /* Ignore parsing errors */ }
         // Return original or null if formatting failed
        return null; 
    };


  const handleUpload = async () => {
     if (parsedData.length === 0) {
         setFormMessage("No valid data detected to upload.");
         return;
     }
     
    setIsProcessing(true);
    setFormMessage("");
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [index, row] of parsedData.entries()) {
      const [ticker, shares, price, costBasis, purchaseDateStr] = row;
      
      const numShares = parseFloat(shares);
      const numPrice = parseFloat(price); // Current/Last Price
      const numCostBasis = parseFloat(costBasis); // Cost Per Share
      const formattedDate = formatDateForAPI(purchaseDateStr);

       // Basic Validation
      if (!ticker || isNaN(numShares) || numShares <= 0 || isNaN(numCostBasis) || numCostBasis <= 0 || !formattedDate) {
           console.warn(`Skipping invalid row ${index + 1}:`, row);
           errors.push(`Row ${index + 1}: Invalid data (Ticker: ${ticker}, Shares: ${shares}, Cost: ${costBasis}, Date: ${purchaseDateStr})`);
           errorCount++;
           continue;
      }

      try {
         // Use the same endpoint as single position add
         const response = await fetchWithAuth(`/positions/${selectedAccount.id}`, {
           method: "POST",
           body: JSON.stringify({
             ticker: ticker.toUpperCase(),
             shares: numShares,
             price: isNaN(numPrice) ? numCostBasis : numPrice, // Use cost basis as price if current price is invalid/missing
             cost_basis: numCostBasis,
             purchase_date: formattedDate
           }),
         });

         if (response.ok) {
           successCount++;
         } else {
            const errorData = await response.json();
            console.error(`Error on row ${index + 1}:`, errorData);
            errors.push(`Row ${index + 1} (${ticker}): ${errorData.detail || 'Failed'}`);
            errorCount++;
         }
      } catch (error) {
         console.error(`Network error on row ${index + 1}:`, error);
         errors.push(`Row ${index + 1} (${ticker}): Network Error - ${error.message}`);
         errorCount++;
      }
       // Optional: Add a small delay between requests to avoid rate limiting
       // await new Promise(resolve => setTimeout(resolve, 50)); 
    }

     setFormMessage(`Upload complete: ${successCount} successful, ${errorCount} failed.`);
     if (errors.length > 0) {
         console.error("Bulk Upload Errors:", errors);
         // Optionally display first few errors in UI
         setFormMessage(prev => prev + `\nFirst few errors:\n${errors.slice(0, 3).join('\n')}`);
     }
     setIsProcessing(false);

     if (onUploadComplete) {
         onUploadComplete({ success: successCount, failed: errorCount });
     }
      // Don't close automatically on error, let user see message
     if (errorCount === 0 && successCount > 0) {
          setTimeout(() => {
              onClose(); 
              setBulkData(""); // Clear data after successful upload
          }, 2000);
     }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bulk Upload to: ${selectedAccount?.account_name || ''}`} size="max-w-4xl">
      <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
           <p>Paste data from your spreadsheet (Excel, Google Sheets). Ensure columns are in this order:</p>
           <p className="font-semibold mt-1">Ticker, Shares, Current Price (optional), Cost Per Share, Purchase Date</p>
             <p className="text-xs mt-1">Dates can be YYYY-MM-DD or MM/DD/YYYY. Current Price is optional, if blank, Cost Per Share will be used.</p>
         </div>

         {/* Data Input Area */}
         <textarea
           value={bulkData}
           onChange={(e) => setBulkData(e.target.value)}
           placeholder="Paste your data here (one position per line)..."
           className="w-full h-36 p-3 border rounded-lg font-mono text-xs focus:ring-blue-300 focus:border-blue-300"
           disabled={isProcessing}
         />
         
         {/* Data Preview Grid */}
         <div className="mb-4">
             <h3 className="text-sm font-semibold mb-2">Data Preview ({parsedData.length} rows detected):</h3>
             <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto bg-gray-50">
                 <table className="min-w-full text-xs">
                     <thead className="bg-gray-200 sticky top-0">
                         <tr>
                             <th className="p-2 text-left font-medium">Ticker</th>
                             <th className="p-2 text-left font-medium">Shares</th>
                             <th className="p-2 text-left font-medium">Price ($)</th>
                             <th className="p-2 text-left font-medium">Cost/Share ($)</th>
                             <th className="p-2 text-left font-medium">Date</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-200">
                        {parsedData.length > 0 ? (
                           parsedData.map((row, rowIndex) => (
                               <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                   <td className="p-2 whitespace-nowrap">{row[0] || ''}</td>
                                   <td className="p-2 whitespace-nowrap">{row[1] || ''}</td>
                                   <td className="p-2 whitespace-nowrap">{row[2] || ''}</td>
                                   <td className="p-2 whitespace-nowrap">{row[3] || ''}</td>
                                   <td className="p-2 whitespace-nowrap">{row[4] || ''}</td>
                               </tr>
                           ))
                        ) : (
                            <tr>
                               <td colSpan="5" className="p-4 text-center text-gray-500">
                                   Paste data above to see preview.
                               </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

       {formMessage && (
         <p className={`text-sm whitespace-pre-wrap ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
           {formMessage}
         </p>
       )}

       <div className="flex justify-between items-center pt-2">
         <button type="button" className="modal-cancel-btn text-sm" onClick={onBack} disabled={isProcessing}>
             ← Back (Change Account)
         </button>
         <div className="flex space-x-3">
           <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isProcessing}>
             Cancel Upload
           </button>
           <button
             type="button"
             onClick={handleUpload}
             className="modal-submit-btn flex items-center justify-center"
             disabled={parsedData.length === 0 || isProcessing}
           >
             {isProcessing ? (
               <>
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" /* SVG Spinner */></svg>
                 Processing...
               </>
             ) : (
               `Upload ${parsedData.length} Positions`
             )}
           </button>
         </div>
       </div>
      </div>
    </Modal>
  );
};

export default BulkUploadDataPasteModal;