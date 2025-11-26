/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const escaped = String(value ?? '').replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
      }).join(',')
    )
  ].join('\n');

  return csv;
};

/**
 * Download CSV file
 */
export const downloadCSV = (data, filename) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Export selected items with auto-generated filename
 */
export const exportSelectedItems = (items, entityType) => {
  if (!items || items.length === 0) return;

  const date = new Date().toISOString().split('T')[0];
  const filename = `${entityType}_export_${date}.csv`;
  downloadCSV(items, filename);

  return items.length;
};
