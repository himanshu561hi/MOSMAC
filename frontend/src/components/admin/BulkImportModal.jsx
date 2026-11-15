import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  X,
  FileCheck,
  HelpCircle
} from 'lucide-react';
import { bulkImportService } from '../../services/bulkImportService';

export const BulkImportModal = ({
  isOpen,
  onClose,
  module,
  moduleTitle = 'Records',
  onSuccess
}) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Mode, 3: Completed
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Validation results
  const [validationData, setValidationData] = useState(null);
  const [importMode, setImportMode] = useState('create_only');

  // Execution results
  const [executionResult, setExecutionResult] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setError(null);
    setValidationData(null);
    setImportMode('create_only');
    setExecutionResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.name.toLowerCase().endsWith('.xlsx')) {
        setFile(selected);
        setError(null);
      } else {
        setError('Please upload a valid Excel spreadsheet (.xlsx).');
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.toLowerCase().endsWith('.xlsx')) {
        setFile(selected);
        setError(null);
      } else {
        setError('Please upload a valid Excel spreadsheet (.xlsx).');
      }
    }
  };

  const handleDownloadTemplate = async (sample) => {
    try {
      setLoading(true);
      await bulkImportService.downloadTemplate(module, sample);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      setError('Please select an Excel file to upload.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await bulkImportService.validateUpload(module, file);
      setValidationData(res);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Pre-import validation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!validationData?.jobId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await bulkImportService.executeImport(module, validationData.jobId, importMode);
      setExecutionResult(res);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    const jobId = executionResult?.jobId || validationData?.jobId;
    if (!jobId) return;
    try {
      await bulkImportService.downloadReport(jobId);
    } catch (err) {
      setError('Failed to download execution report');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Bulk Excel Import: {moduleTitle}</h2>
              <p className="text-xs text-slate-400">Streamlined spreadsheet upload, pre-import validation & audit reporting</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950/30 border-b border-slate-800 text-xs">
          <div className={`flex items-center gap-2 font-medium ${step >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>1</span>
            Template & Upload
          </div>
          <div className="w-12 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 font-medium ${step >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>2</span>
            Validation & Mode
          </div>
          <div className="w-12 h-px bg-slate-800" />
          <div className={`flex items-center gap-2 font-medium ${step >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>3</span>
            Execution & Report
          </div>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: TEMPLATE DOWNLOAD & FILE UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Template downloads */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Step 1: Download Excel Template
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Includes Instructions sheet, pre-formatted columns, and Reference Data lookups.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(true)}
                    disabled={loading}
                    className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Download Sample Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(false)}
                    disabled={loading}
                    className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Download Blank Template (.xlsx)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  Step 2: Upload Completed Spreadsheet
                </h3>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : file
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx"
                    className="hidden"
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full">
                        <FileCheck className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium text-white">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB — Ready for validation</p>
                      <span className="text-xs text-emerald-400 hover:underline mt-1">Click to replace file</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-800/80 text-slate-400 rounded-full">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium text-slate-300">
                        Drag and drop your <span className="text-emerald-400">.xlsx</span> file here, or browse
                      </p>
                      <p className="text-xs text-slate-500">Supports up to 5,000 rows per file (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRE-IMPORT PREVIEW & IMPORT MODES */}
          {step === 2 && validationData && (
            <div className="space-y-6">
              
              {/* Metric Chips */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-400">Total Rows</p>
                  <p className="text-lg font-bold text-white mt-1">{validationData.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                  <p className="text-xs text-emerald-400">Valid Rows</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{validationData.validRows}</p>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
                  <p className="text-xs text-rose-400">Invalid Rows</p>
                  <p className="text-lg font-bold text-rose-400 mt-1">{validationData.invalidRows}</p>
                </div>
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg text-center">
                  <p className="text-xs text-teal-400">New Records</p>
                  <p className="text-lg font-bold text-teal-400 mt-1">{validationData.newRows}</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                  <p className="text-xs text-amber-400">Existing Records</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{validationData.existingRows}</p>
                </div>
              </div>

              {/* Import Mode Selector */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Import Mode
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                      importMode === 'create_only'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="importMode"
                        value="create_only"
                        checked={importMode === 'create_only'}
                        onChange={(e) => setImportMode(e.target.value)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-xs text-white">Create Only (Default)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Creates new records only. Rejects/skips any duplicates or existing matching records.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                      importMode === 'update_existing'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="importMode"
                        value="update_existing"
                        checked={importMode === 'update_existing'}
                        onChange={(e) => setImportMode(e.target.value)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-xs text-white">Update Existing</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Updates existing records by unique identifier (SKU, Slug, Code). New records are skipped.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                      importMode === 'create_update'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="importMode"
                        value="create_update"
                        checked={importMode === 'create_update'}
                        onChange={(e) => setImportMode(e.target.value)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-xs text-white">Create + Update</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Creates new records and updates matching existing ones.
                    </p>
                  </label>
                </div>
              </div>

              {/* Validation Errors Table (if any) */}
              {validationData.errors && validationData.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      Row Validation Errors ({validationData.errors.length})
                    </h4>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-rose-500/20 rounded-lg bg-rose-500/5">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-950/40 text-rose-300 font-semibold sticky top-0 border-b border-rose-500/20">
                        <tr>
                          <th className="py-2 px-3 w-16">Row #</th>
                          <th className="py-2 px-3 w-32">Column</th>
                          <th className="py-2 px-3">Reason</th>
                          <th className="py-2 px-3">Suggested Correction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-500/10 text-slate-300">
                        {validationData.errors.slice(0, 15).map((err, idx) => (
                          <tr key={idx} className="hover:bg-rose-500/10">
                            <td className="py-1.5 px-3 font-mono text-rose-400">{err.row}</td>
                            <td className="py-1.5 px-3 font-medium text-white">{err.column || 'General'}</td>
                            <td className="py-1.5 px-3 text-rose-300">{err.reason}</td>
                            <td className="py-1.5 px-3 text-slate-400">{err.suggestion || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              {validationData.previewRows && validationData.previewRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Data Preview (Showing First {Math.min(5, validationData.previewRows.length)} Rows)
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3 w-16">Status</th>
                          <th className="py-2 px-3 w-16">Row #</th>
                          <th className="py-2 px-3">Title / Key</th>
                          <th className="py-2 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {validationData.previewRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3">
                              {r._valid ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Invalid
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">{r._rowNumber}</td>
                            <td className="py-2 px-3 font-medium text-white">
                              {r.title || r.name || r.sku || r.code || r.question || 'Record'}
                            </td>
                            <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                              {r.description || r.category || r.reason || r.answer || ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: EXECUTION RESULTS */}
          {step === 3 && executionResult && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white">Import Execution Completed</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {executionResult.summary || 'Records have been processed in accordance with your chosen import mode.'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-lg font-bold text-white mt-1">{executionResult.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-xs text-emerald-400">Created</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{executionResult.createdCount}</p>
                </div>
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                  <p className="text-xs text-teal-400">Updated</p>
                  <p className="text-lg font-bold text-teal-400 mt-1">{executionResult.updatedCount}</p>
                </div>
                <div className="p-3 bg-slate-800/40 border border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">Skipped</p>
                  <p className="text-lg font-bold text-slate-400 mt-1">{executionResult.skippedCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download Execution Report (.xlsx)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleValidate}
                disabled={!file || loading}
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Validate & Preview
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition"
              >
                Back to Upload
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={validationData.validRows === 0 || loading}
                  className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Executing Import...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Import ({validationData.validRows} Records)
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition shadow-lg shadow-emerald-500/20"
              >
                Done
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;
