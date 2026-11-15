/**
 * Sanitizes cell values for export to prevent Formula Injection (CSV/Excel Formula Injection).
 * Cells starting with =, +, -, @, \t, or \r can execute arbitrary commands or leak data in spreadsheet viewers.
 */
export function sanitizeForExport(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const str = String(value).trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];

  if (str.length > 0 && dangerousPrefixes.some((p) => str.startsWith(p))) {
    // Prefix with single quote to force treat as plain text in Excel/CSV
    return `'${str}`;
  }

  return str;
}

/**
 * Normalizes and cleans raw cell values from uploaded Excel files.
 * Removes dangerous leading quotes if added for escaping, trims whitespace.
 */
export function cleanImportCell(cellValue) {
  if (cellValue === null || cellValue === undefined) {
    return '';
  }

  // Handle exceljs rich text or object cell values
  if (typeof cellValue === 'object') {
    if (cellValue.text) {
      cellValue = cellValue.text;
    } else if (cellValue.result !== undefined) {
      cellValue = cellValue.result;
    } else if (cellValue.richText && Array.isArray(cellValue.richText)) {
      cellValue = cellValue.richText.map((t) => t.text || '').join('');
    } else {
      cellValue = String(cellValue);
    }
  }

  let str = String(cellValue).trim();

  // Strip single quote if it was prepended as an escape prefix
  if (str.startsWith("'") && str.length > 1) {
    str = str.substring(1);
  }

  return str;
}

/**
 * Validates file buffer magic bytes to ensure it is a real ZIP / XLSX file.
 * XLSX files are PKZIP archives starting with [0x50, 0x4B, 0x03, 0x04].
 */
export function validateXlsxMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}
