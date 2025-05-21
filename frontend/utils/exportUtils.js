// utils/exportUtils.js

/**
 * Export data as CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the exported file
 */
export const exportAsCSV = (data, filename = 'report-data.csv') => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('No data to export');
    return;
  }
  
  try {
    // Extract headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      // Headers row
      headers.join(','),
      // Data rows
      ...data.map(row => {
        return headers.map(header => {
          const value = row[header];
          // Handle special values and formats
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          if (value instanceof Date) return value.toISOString();
          return value;
        }).join(',');
      })
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting data as CSV:', error);
  }
};

/**
 * Export report to PDF
 * Note: This is a simplified version. In a real-world app, you would use 
 * a library like jsPDF or html2pdf to generate proper PDF files.
 * 
 * @param {string} reportTitle - Title of the report
 * @param {Object} reportData - Data to include in the report
 * @param {Object} options - Export options
 */
export const exportAsPDF = (reportTitle, reportData, options = {}) => {
  alert('PDF export functionality would be implemented here with a library like jsPDF or html2pdf');
  console.log('Report Title:', reportTitle);
  console.log('Report Data:', reportData);
  console.log('Export Options:', options);
};

/**
 * Share report via URL or other method
 * @param {string} reportId - ID of the report to share
 * @param {Object} options - Sharing options
 */
export const shareReport = (reportId, options = {}) => {
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/reports/shared/${reportId}`;
  
  // Check if Web Share API is available
  if (navigator.share) {
    navigator.share({
      title: options.title || 'Portfolio Report',
      text: options.text || 'Check out my portfolio report',
      url: shareUrl
    })
    .catch(error => console.error('Error sharing report:', error));
  } else {
    // Fallback to clipboard copy
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('Report link copied to clipboard!');
      })
      .catch(error => {
        console.error('Error copying report link:', error);
        alert('Could not copy link. Report URL: ' + shareUrl);
      });
  }
};

/**
 * Process data for export based on format
 * @param {Object} reportData - Report data to process
 * @param {string} format - Export format (csv, json, etc.)
 * @returns {Array|Object} - Processed data ready for export
 */
export const processDataForExport = (reportData, format = 'csv') => {
  if (!reportData) return [];
  
  // For CSV export, we need to flatten the data structure
  if (format === 'csv') {
    if (Array.isArray(reportData)) {
      return reportData.map(item => flattenObject(item));
    }
    
    if (reportData.chartData && Array.isArray(reportData.chartData)) {
      return reportData.chartData.map(item => flattenObject(item));
    }
    
    return [flattenObject(reportData)];
  }
  
  // For JSON, return as is
  return reportData;
};

/**
 * Flatten a nested object structure
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Prefix for nested keys
 * @returns {Object} - Flattened object
 */
const flattenObject = (obj, prefix = '') => {
  const result = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        // Recursively flatten nested objects
        Object.assign(result, flattenObject(value, newKey));
      } else {
        // Format date objects and handle special values
        if (value instanceof Date) {
          result[newKey] = value.toISOString();
        } else if (typeof value === 'number') {
          result[newKey] = value;
        } else {
          result[newKey] = value || '';
        }
      }
    }
  }
  
  return result;
};