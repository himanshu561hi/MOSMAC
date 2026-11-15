import ExcelJS from 'exceljs';
import { cleanImportCell, validateXlsxMagicBytes } from './excelSanitizer.js';
import { ApiError } from '../../utils/ApiError.js';

export const excelParser = {
  /**
   * Parses an Excel buffer into structured row objects
   * @param {Buffer} buffer - File buffer
   * @param {Object} moduleDef - Module definition with expected columns
   */
  async parseBuffer(buffer, moduleDef) {
    if (!buffer || buffer.length === 0) {
      throw ApiError.badRequest('Uploaded file is empty');
    }

    if (!validateXlsxMagicBytes(buffer)) {
      throw ApiError.badRequest('Invalid file format. File must be a valid .xlsx spreadsheet.');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch (err) {
      throw ApiError.badRequest(`Failed to read Excel workbook: ${err.message}`);
    }

    // Try finding worksheet named 'Data' (case-insensitive) or default to the first non-Instructions sheet
    let worksheet = workbook.worksheets.find(
      (ws) => ws.name.trim().toLowerCase() === 'data'
    );

    if (!worksheet) {
      // Find first worksheet that is not named 'Instructions' or 'Reference Data'
      worksheet = workbook.worksheets.find(
        (ws) =>
          !['instructions', 'reference data', 'reference'].includes(
            ws.name.trim().toLowerCase()
          )
      );
    }

    if (!worksheet) {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet || worksheet.rowCount < 1) {
      throw ApiError.badRequest('Worksheet contains no data rows');
    }

    // Row 1 is expected to be the header row
    const headerRow = worksheet.getRow(1);
    const headerMap = {}; // colNumber -> columnKey

    const normalizeHeader = (h) =>
      String(h || '')
        .replace(/\*/g, '')
        .trim()
        .toLowerCase();

    const expectedCols = moduleDef.columns.map((c) => ({
      key: c.key,
      normalizedLabel: normalizeHeader(c.label),
      required: c.required
    }));

    headerRow.eachCell((cell, colNumber) => {
      const rawHeader = cleanImportCell(cell.value);
      const normalized = normalizeHeader(rawHeader);

      const matchedCol = expectedCols.find(
        (ec) => ec.normalizedLabel === normalized || ec.key.toLowerCase() === normalized
      );

      if (matchedCol) {
        headerMap[colNumber] = matchedCol.key;
      }
    });

    // Check if required headers are present
    const mappedKeys = Object.values(headerMap);
    const missingRequired = expectedCols
      .filter((c) => c.required && !mappedKeys.includes(c.key))
      .map((c) => c.key);

    if (missingRequired.length > 0) {
      throw ApiError.badRequest(
        `Missing required column headers: ${missingRequired.join(', ')}`
      );
    }

    // Extract data rows
    const rows = [];
    const maxRows = 5000; // Safe bounded limit for bulk operation

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      if (rows.length >= maxRows) {
        break;
      }

      const row = worksheet.getRow(rowNumber);
      let hasData = false;
      const rowData = { _rowNumber: rowNumber };

      Object.entries(headerMap).forEach(([colNumber, colKey]) => {
        const cell = row.getCell(Number(colNumber));
        const val = cleanImportCell(cell.value);
        if (val !== '') {
          hasData = true;
        }
        rowData[colKey] = val;
      });

      // Skip completely empty rows
      if (hasData) {
        rows.push(rowData);
      }
    }

    if (rows.length === 0) {
      throw ApiError.badRequest('The uploaded file does not contain any data rows to import');
    }

    return {
      rowCount: rows.length,
      rows,
      headerMap
    };
  }
};

export default excelParser;
