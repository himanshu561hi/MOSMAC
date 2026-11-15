import ExcelJS from 'exceljs';
import { sanitizeForExport } from './excelSanitizer.js';

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F172A' } // Tailwind slate-900
};

const HEADER_FONT = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' }
};

const SUBHEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' } // Tailwind slate-800
};

const BORDER_STYLE = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
};

export const excelGenerator = {
  /**
   * Generates a template workbook (.xlsx buffer) for a specific module
   */
  async generateTemplate({ moduleDef, sample = false, referenceData = {} }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-Commerce Platform Admin System';
    workbook.lastModifiedBy = 'Admin Bulk System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. INSTRUCTIONS SHEET
    const instructionsSheet = workbook.addWorksheet('Instructions', {
      views: [{ showGridLines: true }]
    });

    instructionsSheet.columns = [
      { header: 'Item', key: 'item', width: 28 },
      { header: 'Details', key: 'details', width: 80 }
    ];

    instructionsSheet.addRow({
      item: 'Module Name',
      details: moduleDef.name
    });
    instructionsSheet.addRow({
      item: 'Module ID',
      details: moduleDef.id
    });
    instructionsSheet.addRow({
      item: 'Template Version',
      details: '1.0.0'
    });
    instructionsSheet.addRow({
      item: 'Supported Modes',
      details: 'create_only (Default), update_existing, create_update'
    });
    instructionsSheet.addRow({
      item: 'How to use',
      details: 'Fill in records on the "Data" sheet. Refer to "Reference Data" for valid categories, brands and enumerations.'
    });
    instructionsSheet.addRow({
      item: 'Important Rules',
      details: '1. Do not rename or reorder column headers in the "Data" sheet. 2. Prices are in whole Indian Rupees (INR); the backend converts to paise automatically. 3. Active flags accept "true" or "false".'
    });
    instructionsSheet.addRow({});

    // Instructions columns table
    const tableHeaderRow = instructionsSheet.addRow({
      item: 'Column Name',
      details: 'Requirements & Description'
    });
    tableHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tableHeaderRow.fill = HEADER_FILL;

    moduleDef.columns.forEach((col) => {
      const row = instructionsSheet.addRow({
        item: col.label + (col.required ? ' * (Required)' : ' (Optional)'),
        details: `${col.description || ''} [Type: ${col.type}] ${
          col.allowedValues ? `Allowed: ${col.allowedValues.join(', ')}` : ''
        }`
      });
      row.getCell(1).font = { bold: col.required };
    });

    // 2. DATA SHEET
    const dataSheet = workbook.addWorksheet('Data', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
    });

    dataSheet.columns = moduleDef.columns.map((col) => ({
      header: col.label + (col.required ? ' *' : ''),
      key: col.key,
      width: Math.max(col.label.length + 6, col.width || 18)
    }));

    // Style the header row
    const headerRow = dataSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_STYLE;
    });

    // If sample data requested, add sample rows
    if (sample && moduleDef.sampleRows && moduleDef.sampleRows.length > 0) {
      moduleDef.sampleRows.forEach((sRow) => {
        const addedRow = dataSheet.addRow(sRow);
        addedRow.eachCell((cell) => {
          cell.border = BORDER_STYLE;
          cell.alignment = { vertical: 'middle' };
        });
      });
    }

    // 3. REFERENCE DATA SHEET (if reference data provided)
    const refSheet = workbook.addWorksheet('Reference Data', {
      views: [{ showGridLines: true }]
    });

    let currentColumn = 1;
    for (const [refKey, refItems] of Object.entries(referenceData)) {
      if (Array.isArray(refItems) && refItems.length > 0) {
        const titleCell = refSheet.getCell(1, currentColumn);
        titleCell.value = refKey.toUpperCase();
        titleCell.font = HEADER_FONT;
        titleCell.fill = SUBHEADER_FILL;

        refItems.forEach((item, index) => {
          const cell = refSheet.getCell(index + 2, currentColumn);
          cell.value = typeof item === 'object' ? `${item.name || item.title || item.code} (${item.slug || item._id || item.value})` : String(item);
          cell.border = BORDER_STYLE;
        });

        refSheet.getColumn(currentColumn).width = 30;
        currentColumn += 2; // leave a gap between reference tables
      }
    }

    return await workbook.xlsx.writeBuffer();
  },

  /**
   * Generates a populated Excel export (.xlsx buffer) for authorized data
   */
  async generateExport({ moduleDef, records = [], title = 'Export' }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-Commerce Platform Admin System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(title, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
    });

    sheet.columns = moduleDef.columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(col.label.length + 5, col.width || 18)
    }));

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_STYLE;
    });

    // Populate data rows with formula injection sanitization
    records.forEach((record) => {
      const sanitizedRecord = {};
      moduleDef.columns.forEach((col) => {
        let val = record[col.key];
        sanitizedRecord[col.key] = sanitizeForExport(val);
      });

      const row = sheet.addRow(sanitizedRecord);
      row.eachCell((cell) => {
        cell.border = BORDER_STYLE;
        cell.alignment = { vertical: 'middle' };
      });
    });

    return await workbook.xlsx.writeBuffer();
  },

  /**
   * Generates an Import Job Execution & Error Report (.xlsx buffer)
   */
  async generateErrorReport(job) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'E-Commerce Platform Admin System';

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Import Summary', {
      views: [{ showGridLines: true }]
    });

    summarySheet.columns = [
      { header: 'Property', key: 'key', width: 25 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    summarySheet.addRow({ key: 'Import Job ID', value: String(job._id) });
    summarySheet.addRow({ key: 'Module', value: job.module });
    summarySheet.addRow({ key: 'Original Filename', value: job.filename });
    summarySheet.addRow({ key: 'Import Mode', value: job.importMode });
    summarySheet.addRow({ key: 'Status', value: job.status });
    summarySheet.addRow({ key: 'Total Rows', value: job.totalRows });
    summarySheet.addRow({ key: 'Valid Rows', value: job.validRows });
    summarySheet.addRow({ key: 'Invalid Rows', value: job.invalidRows });
    summarySheet.addRow({ key: 'Created Count', value: job.createdCount });
    summarySheet.addRow({ key: 'Updated Count', value: job.updatedCount });
    summarySheet.addRow({ key: 'Skipped Count', value: job.skippedCount });
    summarySheet.addRow({ key: 'Imported By', value: job.importedByEmail });
    summarySheet.addRow({ key: 'Created At', value: job.createdAt ? job.createdAt.toISOString() : '' });
    summarySheet.addRow({ key: 'Completed At', value: job.completedAt ? job.completedAt.toISOString() : '' });

    // Sheet 2: Errors
    const errorSheet = workbook.addWorksheet('Errors', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
    });

    errorSheet.columns = [
      { header: 'Excel Row #', key: 'row', width: 14 },
      { header: 'Column', key: 'column', width: 22 },
      { header: 'Offending Value', key: 'value', width: 25 },
      { header: 'Error Reason', key: 'reason', width: 45 },
      { header: 'Suggested Fix', key: 'suggestion', width: 45 }
    ];

    const errHeader = errorSheet.getRow(1);
    errHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF991B1B' } // Red-800
    };
    errHeader.font = HEADER_FONT;

    if (job.errors && job.errors.length > 0) {
      job.errors.forEach((err) => {
        errorSheet.addRow({
          row: err.row,
          column: sanitizeForExport(err.column),
          value: sanitizeForExport(err.value),
          reason: sanitizeForExport(err.reason),
          suggestion: sanitizeForExport(err.suggestion)
        });
      });
    }

    return await workbook.xlsx.writeBuffer();
  }
};

export default excelGenerator;
