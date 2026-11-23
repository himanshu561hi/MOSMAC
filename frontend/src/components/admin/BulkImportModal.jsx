import React, { useState, useRef, useEffect } from 'react';
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
  FolderArchive,
  Image as ImageIcon,
  Check,
  Info
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
  const [imagesZip, setImagesZip] = useState(null);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Validation results & options
  const [validationData, setValidationData] = useState(null);
  const [importMode, setImportMode] = useState('create_only');
  const [replaceImages, setReplaceImages] = useState(false);

  // Execution results & progress
  const [executionResult, setExecutionResult] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, text: '' });

  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleReset = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setStep(1);
    setFile(null);
    setImagesZip(null);
    setError(null);
    setValidationData(null);
    setImportMode('create_only');
    setReplaceImages(false);
    setExecutionResult(null);
    setProgress({ current: 0, total: 0, text: '' });
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing while execution is active
    handleReset();
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleExcelDrop = (e) => {
    e.preventDefault();
    setIsDraggingExcel(false);
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

  const handleExcelSelect = (e) => {
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

  const handleZipDrop = (e) => {
    e.preventDefault();
    setIsDraggingZip(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.name.toLowerCase().endsWith('.zip')) {
        setImagesZip(selected);
        setError(null);
      } else {
        setError('Please upload a valid Images ZIP archive (.zip).');
      }
    }
  };

  const handleZipSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.toLowerCase().endsWith('.zip')) {
        setImagesZip(selected);
        setError(null);
      } else {
        setError('Please upload a valid Images ZIP archive (.zip).');
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
      const validateArgs = [module, file];
      if (imagesZip) {
        validateArgs.push(imagesZip);
      }
      const res = await bulkImportService.validateUpload(...validateArgs);
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
      setStep(3); // Transition to Step 3 (Execution & Report) immediately
      const total = validationData.validRows || validationData.totalRows || 0;
      setProgress({
        current: 0,
        total,
        text: 'Initiating upload and transferring images to Cloudinary...',
        imagesUploaded: 0,
        imagesSkipped: 0
      });

      // Poll every 800ms to update progress in real-time
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (typeof bulkImportService.getJobStatus === 'function') {
        pollTimerRef.current = setInterval(async () => {
          try {
            const status = await bulkImportService.getJobStatus(validationData.jobId);
            if (status) {
              setProgress({
                current: status.progressCurrent || 0,
                total: status.progressTotal || total,
                text: status.progressStep || `Uploading images (${status.progressCurrent || 0}/${status.progressTotal || total})...`,
                imagesUploaded: status.imagesUploaded || 0,
                imagesSkipped: status.imagesSkipped || 0
              });

              if (status.status === 'completed') {
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                setExecutionResult(status);
                setLoading(false);
                if (onSuccess) onSuccess();
              } else if (status.status === 'failed') {
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                setError(status.summary || 'Import job failed on server.');
                setLoading(false);
              }
            }
          } catch {
            // ignore transient poll network blip
          }
        }, 800);
      }

      const executeArgs = [module, validationData.jobId, importMode];
      if (replaceImages) {
        executeArgs.push(true);
      }

      const res = await bulkImportService.executeImport(...executeArgs);

      if (res && res.status !== 'processing') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setExecutionResult(res);
        setLoading(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || '';
      // If error is timeout, network error, or job already processing, DO NOT unlock button or abort!
      // The background job is still actively running on the backend; continue polling!
      if (
        errMsg.includes('currently being processed') ||
        errMsg.includes('timeout') ||
        errMsg.includes('Network Error') ||
        err.code === 'ECONNABORTED'
      ) {
        console.log('[Bulk Import] Server is actively executing import in background, maintaining progress polling...');
        return;
      }
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setError(errMsg || 'Import execution failed.');
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    const jobId = executionResult?.jobId || validationData?.jobId;
    if (!jobId) return;
    try {
      await bulkImportService.downloadReport(jobId);
    } catch {
      setError('Failed to download execution report');
    }
  };

  const isProductModule = module === 'products';

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
            disabled={loading}
            className={`p-1.5 rounded-lg transition ${
              loading
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
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

              {/* Upload Dropzones */}
              <div>
                <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  Step 2: Upload Spreadsheet {isProductModule ? '& Images ZIP' : ''}
                </h3>

                <div className={`grid gap-4 ${isProductModule ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  
                  {/* Excel Dropzone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingExcel(true); }}
                    onDragLeave={() => setIsDraggingExcel(false)}
                    onDrop={handleExcelDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                      isDraggingExcel
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : file
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleExcelSelect}
                      accept=".xlsx"
                      className="hidden"
                    />

                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full">
                          <FileCheck className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-medium text-white line-clamp-1">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(file.size)} — Ready for validation</p>
                        <span className="text-xs text-emerald-400 hover:underline mt-1">Click to replace Excel</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-slate-800/80 text-slate-400 rounded-full">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          Excel Spreadsheet <span className="text-rose-400">*</span>
                        </p>
                        <p className="text-xs text-slate-400">Drag & drop your <span className="text-emerald-400 font-mono">.xlsx</span> file here, or browse</p>
                        <p className="text-[11px] text-slate-500">Required: Sheet "Data" columns</p>
                      </div>
                    )}
                  </div>

                  {/* Images ZIP Dropzone (Only for Products module) */}
                  {isProductModule && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingZip(true); }}
                      onDragLeave={() => setIsDraggingZip(false)}
                      onDrop={handleZipDrop}
                      onClick={() => zipInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition relative ${
                        isDraggingZip
                          ? 'border-teal-500 bg-teal-500/5'
                          : imagesZip
                          ? 'border-teal-500/40 bg-teal-500/5'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                      }`}
                    >
                      <input
                        type="file"
                        ref={zipInputRef}
                        onChange={handleZipSelect}
                        accept=".zip"
                        className="hidden"
                      />

                      {imagesZip ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-full">
                            <FolderArchive className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-medium text-white line-clamp-1">{imagesZip.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(imagesZip.size)} — Attached for matching</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-teal-400 hover:underline">Replace ZIP</span>
                            <span className="text-slate-600">•</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImagesZip(null);
                              }}
                              className="text-xs text-rose-400 hover:underline"
                            >
                              Remove ZIP
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-slate-800/80 text-teal-400 rounded-full">
                            <FolderArchive className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-medium text-slate-300">
                            Images ZIP <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                          </p>
                          <p className="text-xs text-slate-400">Drag & drop your <span className="text-teal-400 font-mono">.zip</span> file here, or browse</p>
                          <p className="text-[11px] text-slate-500">Structure: PRODUCT_IMAGES/&lt;SKU&gt;/main.jpg</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRE-IMPORT PREVIEW & IMPORT MODES */}
          {step === 2 && validationData && (
            <div className="space-y-6">
              
              {/* Primary Metric Chips */}
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

              {/* Secondary Images ZIP Metric Chips (If Images ZIP is attached) */}
              {validationData.hasImagesZip && (
                <div className="p-4 bg-teal-950/20 border border-teal-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-teal-300 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-teal-400" />
                      Images ZIP Analysis ({validationData.imagesFound} Images Found)
                    </h4>
                    <span className="text-[11px] text-teal-400/80 font-mono">Matched by SKU</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-2.5 bg-slate-900/80 border border-teal-500/20 rounded-lg text-center">
                      <p className="text-[11px] text-slate-400">SKU Folders Found</p>
                      <p className="text-base font-bold text-teal-300 mt-0.5">{validationData.skuFoldersFound || 0}</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 border border-teal-500/20 rounded-lg text-center">
                      <p className="text-[11px] text-slate-400">Products with Images</p>
                      <p className="text-base font-bold text-emerald-400 mt-0.5">{validationData.productsWithImages || 0}</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 border border-teal-500/20 rounded-lg text-center">
                      <p className="text-[11px] text-slate-400">Excel SKUs w/o Images</p>
                      <p className="text-base font-bold text-amber-400 mt-0.5">{validationData.excelSkusWithoutImages || 0}</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 border border-teal-500/20 rounded-lg text-center">
                      <p className="text-[11px] text-slate-400">ZIP Folders w/o Product</p>
                      <p className="text-base font-bold text-purple-400 mt-0.5">{validationData.orphanFoldersCount || 0}</p>
                    </div>
                    <div className="p-2.5 bg-slate-900/80 border border-teal-500/20 rounded-lg text-center">
                      <p className="text-[11px] text-slate-400">Images Found</p>
                      <p className="text-base font-bold text-white mt-0.5">{validationData.imagesFound || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Warnings Box (If any non-blocking warnings) */}
              {validationData.imageWarnings && validationData.imageWarnings.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Image Warnings & Advisories ({validationData.imageWarnings.length})
                  </h4>
                  <ul className="text-xs text-amber-200/90 space-y-1 list-disc pl-5 max-h-32 overflow-y-auto">
                    {validationData.imageWarnings.slice(0, 10).map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                    {validationData.imageWarnings.length > 10 && (
                      <li className="text-slate-400 list-none">
                        ...and {validationData.imageWarnings.length - 10} more warnings (included in final report).
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Import Mode Selector & Replace Images Option */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
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

                {/* Replace Existing Images Checkbox (for products with images ZIP) */}
                {isProductModule && validationData.hasImagesZip && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={replaceImages}
                        onChange={(e) => setReplaceImages(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white">Replace existing images on update</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          When unchecked (recommended), existing product images are retained and only new images (by content hash) are added. When checked, the product gallery is completely replaced by the ZIP images.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
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
                            <td className="py-1.5 px-3 font-mono text-rose-400">
                              {err.row === 0 ? 'All' : err.row}
                            </td>
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
                          {validationData.hasImagesZip && (
                            <th className="py-2 px-3 w-40">Images</th>
                          )}
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
                            {validationData.hasImagesZip && (
                              <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                                {r._imagesSummary || (r._imagesCount !== undefined ? `${r._imagesCount} images` : '—')}
                              </td>
                            )}
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

          {/* STEP 3: EXECUTION IN PROGRESS, COMPLETED REPORT OR ERROR */}
          {step === 3 && (
            <div className="py-2 space-y-6">
              {/* STATE A: EXECUTION IN PROGRESS */}
              {(loading || (!executionResult && !error)) && (
                <div className="py-6 px-4 max-w-xl mx-auto space-y-6 text-center animate-in fade-in">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <UploadCloud className="w-8 h-8 animate-bounce" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white">Importing Records & Uploading Images</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {progress.text || 'Transferring images to Cloudinary and writing catalog records...'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Overall Progress</span>
                      <span className="text-emerald-400 font-semibold">
                        {progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Live Stat Badges */}
                  <div className="grid grid-cols-3 gap-3 text-left">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <p className="text-[11px] text-slate-400">Products</p>
                      <p className="text-sm font-bold text-white font-mono mt-0.5">
                        {progress.current} / {progress.total}
                      </p>
                    </div>
                    <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                      <p className="text-[11px] text-teal-400">Images Uploaded</p>
                      <p className="text-sm font-bold text-teal-300 font-mono mt-0.5">
                        {progress.imagesUploaded || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg">
                      <p className="text-[11px] text-slate-400">Duplicates Skipped</p>
                      <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
                        {progress.imagesSkipped || 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Please do not close this modal or refresh while images are uploading.</span>
                  </div>
                </div>
              )}

              {/* STATE B: EXECUTION COMPLETED */}
              {executionResult && (
                <div className="text-center py-4 space-y-6 animate-in fade-in">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white">Import Execution Completed</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {executionResult.summary || 'Records and images have been processed in accordance with your chosen import mode.'}
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <p className="text-xs text-slate-400">Total Rows</p>
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

                  {/* Images Execution Metrics (If images were handled) */}
                  {(executionResult.imagesUploaded > 0 || executionResult.imagesSkipped > 0) && (
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pt-1">
                      <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                        <p className="text-xs text-teal-400">Images Uploaded</p>
                        <p className="text-lg font-bold text-teal-300 mt-1">{executionResult.imagesUploaded}</p>
                      </div>
                      <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg">
                        <p className="text-xs text-slate-400">Duplicates Skipped</p>
                        <p className="text-lg font-bold text-slate-300 mt-1">{executionResult.imagesSkipped}</p>
                      </div>
                    </div>
                  )}

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

              {/* STATE C: EXECUTION FAILED */}
              {error && !loading && !executionResult && (
                <div className="text-center py-6 space-y-4 max-w-md mx-auto animate-in fade-in">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Import Execution Failed</h3>
                    <p className="text-xs text-rose-300 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              )}
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
            <div className="w-full flex items-center justify-between">
              {loading ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Upload & import in progress...</span>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="px-5 py-2 text-xs font-semibold text-slate-400 bg-slate-800 rounded-lg cursor-wait flex items-center gap-2 border border-slate-700/50"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    Uploading ({progress.current}/{progress.total})...
                  </button>
                </>
              ) : error && !executionResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setStep(2); setError(null); }}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition"
                  >
                    Back to Validation
                  </button>
                  <button
                    type="button"
                    onClick={handleExecute}
                    className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Import
                  </button>
                </>
              ) : (
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
          )}
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;
