import jsPDF from 'jspdf';

/**
 * Export data to CSV file
 */
export const exportToCSV = (data: any[], filename: string, headers?: string[]): void => {
    if (!data || data.length === 0) {
        return;
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
        csvHeaders.join(','), // Header row
        ...data.map(row => 
            csvHeaders.map(header => {
                const value = row[header];
                // Handle null/undefined
                if (value === null || value === undefined) return '';
                // Handle objects/arrays
                if (typeof value === 'object') return JSON.stringify(value);
                // Escape commas and quotes
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export data to PDF file
 */
export const exportToPDF = (
    data: any[],
    filename: string,
    title: string,
    columns: { key: string; label: string; width?: number }[]
): void => {
    if (!data || data.length === 0) {
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const startY = margin + 10;
    let y = startY;

    // Add title
    doc.setFontSize(16);
    doc.text(title, margin, y);
    y += 10;

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 10;

    // Calculate column widths
    const availableWidth = pageWidth - (margin * 2);
    const totalWidth = columns.reduce((sum, col) => sum + (col.width || 1), 0);
    const columnWidths = columns.map(col => ((col.width || 1) / totalWidth) * availableWidth);

    // Add table header
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    let x = margin;
    columns.forEach((col, index) => {
        doc.text(col.label, x, y);
        x += columnWidths[index];
    });
    y += 8;

    // Add table rows
    doc.setFont(undefined, 'normal');
    data.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (y > pageHeight - 20) {
            doc.addPage();
            y = margin;
        }

        x = margin;
        columns.forEach((col, colIndex) => {
            const value = row[col.key];
            const text = value !== null && value !== undefined ? String(value) : '';
            // Truncate long text
            const maxWidth = columnWidths[colIndex] - 2;
            const truncatedText = doc.splitTextToSize(text, maxWidth);
            doc.text(truncatedText, x, y);
            x += columnWidths[colIndex];
        });
        y += 7;
    });

    // Save PDF
    doc.save(`${filename}.pdf`);
};

/**
 * Export reports data to CSV
 */
export const exportReportsToCSV = (reports: any, period: string, dateRange?: [Date, Date] | null): void => {
    const data: any[] = [];
    
    // Add summary row
    data.push({
        Metric: 'Total Orders',
        Value: reports.total_orders || 0
    });
    data.push({
        Metric: 'Total Revenue',
        Value: `$${(reports.total_revenue || 0).toFixed(2)}`
    });
    data.push({
        Metric: 'Average Order Value',
        Value: `$${(reports.average_order_value || 0).toFixed(2)}`
    });
    data.push({}); // Empty row
    
    // Add orders by status
    if (reports.orders_by_status && reports.orders_by_status.length > 0) {
        data.push({ Metric: 'Status', Count: 'Count', Revenue: 'Revenue' });
        reports.orders_by_status.forEach((status: any) => {
            data.push({
                Metric: status.status,
                Count: status.count,
                Revenue: `$${(status.revenue || 0).toFixed(2)}`
            });
        });
    }

    const dateStr = dateRange 
        ? `${dateRange[0].toISOString().split('T')[0]}_to_${dateRange[1].toISOString().split('T')[0]}`
        : period;
    exportToCSV(data, `reports_${dateStr}`, ['Metric', 'Count', 'Revenue']);
};

/**
 * Export reports data to PDF
 */
export const exportReportsToPDF = (reports: any, period: string, dateRange?: [Date, Date] | null): void => {
    const dateStr = dateRange 
        ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`
        : period;
    const title = `Sales Report - ${dateStr}`;
    
    const data: any[] = [];
    
    // Add summary
    data.push({
        metric: 'Total Orders',
        value: reports.total_orders || 0
    });
    data.push({
        metric: 'Total Revenue',
        value: `$${(reports.total_revenue || 0).toFixed(2)}`
    });
    data.push({
        metric: 'Average Order Value',
        value: `$${(reports.average_order_value || 0).toFixed(2)}`
    });
    
    // Add orders by status
    if (reports.orders_by_status && reports.orders_by_status.length > 0) {
        reports.orders_by_status.forEach((status: any) => {
            data.push({
                metric: `${status.status} Orders`,
                value: `${status.count} ($${(status.revenue || 0).toFixed(2)})`
            });
        });
    }

    exportToPDF(
        data,
        `reports_${period}`,
        title,
        [
            { key: 'metric', label: 'Metric', width: 2 },
            { key: 'value', label: 'Value', width: 1 }
        ]
    );
};

