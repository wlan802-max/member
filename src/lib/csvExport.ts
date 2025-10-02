import { format } from 'date-fns';

export interface ColumnConfig {
  key: string;
  header: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  data: any[];
  columns: ColumnConfig[];
  filename: string;
}

function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

function formatDateForCSV(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    return format(new Date(dateString), 'yyyy-MM-dd');
  } catch (error) {
    return String(dateString);
  }
}

export function exportToCSV({ data, columns, filename }: ExportOptions): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');
  
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      
      if (col.format) {
        return escapeCSVValue(col.format(value));
      }
      
      if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
        return escapeCSVValue(formatDateForCSV(value));
      }
      
      return escapeCSVValue(value);
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  const filenameWithTimestamp = filename.includes('.csv') 
    ? filename.replace('.csv', `_${timestamp}.csv`)
    : `${filename}_${timestamp}.csv`;
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filenameWithTimestamp);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
