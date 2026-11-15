import { apiClient } from './apiClient.js';

function triggerBlobDownload(blob, filename) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const bulkImportService = {
  /**
   * Downloads sample or blank .xlsx template for a module
   */
  async downloadTemplate(module, sample = false) {
    const response = await apiClient.get(`/admin/bulk/${module}/template`, {
      params: { sample: sample ? 'true' : 'false' },
      responseType: 'blob'
    });

    const filename = `${module}_template_${sample ? 'sample' : 'blank'}.xlsx`;
    triggerBlobDownload(new Blob([response.data]), filename);
  },

  /**
   * Uploads and pre-validates an Excel file, returns preview and error analysis
   */
  async validateUpload(module, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/admin/bulk/${module}/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data?.data || response.data;
  },

  /**
   * Executes a validated import job with mode (create_only, update_existing, create_update)
   */
  async executeImport(module, jobId, importMode = 'create_only') {
    const response = await apiClient.post(`/admin/bulk/${module}/execute`, {
      jobId,
      importMode
    });

    return response.data?.data || response.data;
  },

  /**
   * Exports module records to a sanitized Excel spreadsheet (.xlsx)
   */
  async exportModule(module, params = {}) {
    const response = await apiClient.get(`/admin/bulk/${module}/export`, {
      params,
      responseType: 'blob'
    });

    const filename = `${module}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    triggerBlobDownload(new Blob([response.data]), filename);
  },

  /**
   * Retrieves import jobs history
   */
  async getHistory(params = {}) {
    const response = await apiClient.get('/admin/bulk/history', { params });
    return response.data?.data || response.data;
  },

  /**
   * Downloads execution report (.xlsx) for an import job
   */
  async downloadReport(jobId) {
    const response = await apiClient.get(`/admin/bulk/history/${jobId}/report`, {
      responseType: 'blob'
    });

    const filename = `import_report_${jobId}.xlsx`;
    triggerBlobDownload(new Blob([response.data]), filename);
  }
};

export default bulkImportService;
