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

function extractBlob(response) {
  if (response instanceof Blob) return response;
  if (response?.data instanceof Blob) return response.data;
  if (response instanceof ArrayBuffer) {
    return new Blob([response], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }
  if (response?.data instanceof ArrayBuffer) {
    return new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }
  const raw = response?.data !== undefined ? response.data : response;
  return new Blob([raw], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

export const bulkImportService = {
  /**
   * Downloads sample or blank .xlsx template for a module
   */
  async downloadTemplate(module, sample = false) {
    try {
      const response = await apiClient.get(`/admin/bulk/${module}/template`, {
        params: { sample: sample ? 'true' : 'false' },
        responseType: 'blob'
      });

      const blob = extractBlob(response);
      const filename = `${module}_template_${sample ? 'sample' : 'blank'}.xlsx`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      if (err instanceof Blob || err.response?.data instanceof Blob) {
        const errorBlob = err instanceof Blob ? err : err.response.data;
        const text = await errorBlob.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Failed to download template');
        } catch {
          throw new Error(text || 'Failed to download template');
        }
      }
      throw err;
    }
  },

  /**
   * Uploads and pre-validates an Excel file (and optional Images ZIP), returns preview and error analysis
   */
  async validateUpload(module, file, imagesZip = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (imagesZip) {
      formData.append('imagesZip', imagesZip);
    }

    const response = await apiClient.post(`/admin/bulk/${module}/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data?.data || response.data;
  },

  /**
   * Executes a validated import job with mode (create_only, update_existing, create_update) and replaceImages flag
   */
  async executeImport(module, jobId, importMode = 'create_only', replaceImages = false) {
    const response = await apiClient.post(`/admin/bulk/${module}/execute`, {
      jobId,
      importMode,
      replaceImages: Boolean(replaceImages)
    });

    return response.data?.data || response.data;
  },

  /**
   * Polls live progress and status of an import job
   */
  async getJobStatus(jobId) {
    const response = await apiClient.get(`/admin/bulk/job/${jobId}/status`);
    return response.data?.data || response.data;
  },

  /**
   * Exports module records to a sanitized Excel spreadsheet (.xlsx)
   */
  async exportModule(module, params = {}) {
    try {
      const response = await apiClient.get(`/admin/bulk/${module}/export`, {
        params,
        responseType: 'blob'
      });

      const blob = extractBlob(response);
      const filename = `${module}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      if (err instanceof Blob || err.response?.data instanceof Blob) {
        const errorBlob = err instanceof Blob ? err : err.response.data;
        const text = await errorBlob.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Failed to export Excel file');
        } catch {
          throw new Error(text || 'Failed to export Excel file');
        }
      }
      throw err;
    }
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
    try {
      const response = await apiClient.get(`/admin/bulk/history/${jobId}/report`, {
        responseType: 'blob'
      });

      const blob = extractBlob(response);
      const filename = `import_report_${jobId}.xlsx`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      if (err instanceof Blob || err.response?.data instanceof Blob) {
        const errorBlob = err instanceof Blob ? err : err.response.data;
        const text = await errorBlob.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Failed to download report');
        } catch {
          throw new Error(text || 'Failed to download report');
        }
      }
      throw err;
    }
  }
};

export default bulkImportService;
