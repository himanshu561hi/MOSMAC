import React, { useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { bulkImportService } from '../../services/bulkImportService';
import { BulkImportModal } from './BulkImportModal';

export const BulkActionButtons = ({
  module,
  moduleTitle = 'Records',
  supportsImport = true,
  supportsExport = true,
  onSuccess,
  exportParams = {},
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await bulkImportService.exportModule(module, exportParams);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to export Excel file');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {supportsExport && (
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors disabled:opacity-50"
          title={`Export all ${moduleTitle} to Excel (.xlsx)`}
        >
          {exporting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <Download className="w-3.5 h-3.5 text-emerald-600" />
          )}
          Export Excel
        </button>
      )}

      {supportsImport && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors"
          title={`Bulk import ${moduleTitle} from Excel (.xlsx)`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          Bulk Import
        </button>
      )}

      {supportsImport && (
        <BulkImportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          module={module}
          moduleTitle={moduleTitle}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
};

export default BulkActionButtons;
