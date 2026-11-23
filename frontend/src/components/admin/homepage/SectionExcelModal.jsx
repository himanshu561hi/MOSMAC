import React, { useState, useRef } from 'react';
import { homepageSectionService } from '@/services/homepageSectionService';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
  Check,
  RefreshCw
} from 'lucide-react';

export function SectionExcelModal({ isOpen, onClose, onImportCompleted }) {
  if (!isOpen) return null;

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationPreview, setValidationPreview] = useState(null);
  const [importMode, setImportMode] = useState('append'); // 'append' or 'replace'
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleDownloadSample = async () => {
    try {
      await homepageSectionService.downloadSampleExcel();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to download sample Excel template');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setSuccessResult(null);
    setIsValidating(true);

    try {
      const preview = await homepageSectionService.validateExcelUpload(file);
      setValidationPreview(preview);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to validate uploaded Excel file');
      setValidationPreview(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!validationPreview || !validationPreview.validItems || validationPreview.validItems.length === 0) {
      setErrorMessage('No valid rows available to import.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');

    try {
      const result = await homepageSectionService.executeExcelImport({
        validItems: validationPreview.validItems,
        mode: importMode
      });
      setSuccessResult(result);
      onImportCompleted?.();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to execute Excel import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setValidationPreview(null);
    setSuccessResult(null);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Bulk Excel Assignment & Management
              </h2>
              <p className="text-xs text-gray-500">
                Assign products to homepage sections in bulk using Microsoft Excel (.xlsx)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Top Info & Download Template CTA */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Need the standardized template?</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Download the official template with columns: Section Identifier, Product SKU, Display Order.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="text-xs gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Download Sample Excel
            </Button>
          </div>

          {/* Success state after import execution */}
          {successResult ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">
                Excel Import Completed Successfully!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                {successResult.message || `Successfully processed assignments across homepage sections in ${importMode} mode.`}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  Import Another File
                </Button>
                <Button variant="primary" size="sm" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : !validationPreview ? (
            /* Upload Zone */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-white hover:bg-emerald-50/20 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-emerald-100 text-gray-500 group-hover:text-emerald-700 flex items-center justify-center mx-auto transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mt-3">
                  Click to select or drag and drop Excel file
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Supports standard Excel files (.xlsx, .xls) up to 10MB
                </p>
              </div>

              {isValidating && (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
                  <LoadingSpinner size="md" />
                  <span>Validating SKUs and Section Identifiers...</span>
                </div>
              )}
            </div>
          ) : (
            /* Validation Preview Screen */
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Validation Preview: {selectedFile?.name}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Review parsed rows and select import mode before confirming.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-upload
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Total Rows</span>
                  <strong className="text-lg text-gray-900">{validationPreview.totalRows}</strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Valid Rows</span>
                  <strong className="text-lg text-emerald-800">{validationPreview.validRows}</strong>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-amber-700 block text-[10px] uppercase font-bold">Duplicates</span>
                  <strong className="text-lg text-amber-800">{validationPreview.duplicateRecords || 0}</strong>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-rose-700 block text-[10px] uppercase font-bold">Invalid / Not Found</span>
                  <strong className="text-lg text-rose-800">{validationPreview.invalidRows}</strong>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                <label className="block text-xs font-bold text-gray-800">
                  Select Import Mode *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <strong className="text-xs text-gray-900 block font-semibold">Append Mode</strong>
                      <span className="text-[11px] text-gray-500 block">
                        Adds new product assignments while preserving all existing products in sections.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <strong className="text-xs text-gray-900 block font-semibold">Replace Mode</strong>
                      <span className="text-[11px] text-gray-500 block">
                        Replaces existing product assignments for the sections included in this Excel file.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error details table if invalid rows exist */}
              {validationPreview.errors && validationPreview.errors.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Validation Issues ({validationPreview.errors.length})
                  </h4>
                  <div className="max-h-36 overflow-y-auto border border-rose-200 rounded-lg bg-rose-50/30 text-xs divide-y divide-rose-100">
                    {validationPreview.errors.map((err, idx) => (
                      <div key={idx} className="p-2 text-rose-800 text-[11px] flex items-center justify-between">
                        <span>Row {err.row}: {err.message}</span>
                        {err.sku && <span className="font-mono text-rose-600 font-bold">SKU: {err.sku}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteImport}
                  isLoading={isImporting}
                  disabled={isImporting || !validationPreview.validRows || validationPreview.validRows === 0}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Import {validationPreview.validRows} Products
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SectionExcelModal;
