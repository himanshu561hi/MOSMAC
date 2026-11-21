import { MODULE_DEFINITIONS } from '../services/excel/moduleRegistry.js';
import { excelGenerator } from '../services/excel/excelGenerator.js';
import { universalImportService } from '../services/excel/universalImportService.js';
import { universalExportService } from '../services/excel/universalExportService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const adminImportExportController = {
  /**
   * GET /api/v1/admin/bulk/:module/template?sample=true|false
   * Generates and downloads module-specific .xlsx template
   */
  async downloadTemplate(req, res, next) {
    try {
      const { module } = req.params;
      const sample = req.query.sample === 'true';

      const moduleDef = MODULE_DEFINITIONS[module];
      if (!moduleDef) {
        throw ApiError.badRequest(`Unknown module: ${module}`);
      }

      if (!moduleDef.supportsImport) {
        throw ApiError.forbidden(
          `Import template is not available for module '${module}' (Export-only module).`
        );
      }

      let referenceData = {};
      if (typeof moduleDef.getReferenceData === 'function') {
        try {
          referenceData = await moduleDef.getReferenceData();
        } catch (err) {
          console.warn('Could not fetch dynamic reference data:', err.message);
        }
      }

      const buffer = await excelGenerator.generateTemplate({
        moduleDef,
        sample,
        referenceData
      });

      const filename = `${module}_template_${sample ? 'sample' : 'blank'}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/bulk/:module/validate
   * Parses uploaded Excel buffer (and optional Images ZIP) and returns pre-import validation preview
   */
  async validateUpload(req, res, next) {
    try {
      const { module } = req.params;

      const excelFile = req.file || req.files?.file?.[0];
      const imagesZipFile = req.files?.imagesZip?.[0] || null;

      if (!excelFile || !excelFile.buffer) {
        throw ApiError.badRequest('Please upload an Excel (.xlsx) file.');
      }

      const validationResult = await universalImportService.validateUpload({
        module,
        buffer: excelFile.buffer,
        originalname: excelFile.originalname,
        imagesZipBuffer: imagesZipFile?.buffer || null,
        imagesZipName: imagesZipFile?.originalname || null,
        user: req.user
      });

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        `Pre-import validation completed: ${validationResult.validRows} valid rows, ${validationResult.invalidRows} invalid rows.`,
        validationResult
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/bulk/:module/execute
   * Executes validated import job with chosen import mode
   */
  async executeImport(req, res, next) {
    try {
      const { jobId, importMode = 'create_only', replaceImages = false } = req.body;

      if (!jobId) {
        throw ApiError.badRequest('jobId is required to execute import.');
      }

      const result = await universalImportService.executeImport({
        jobId,
        importMode,
        replaceImages: Boolean(replaceImages),
        user: req.user
      });

      return sendSuccess(res, HTTP_STATUS.OK, result.summary, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/bulk/job/:jobId/status
   * Retrieves live progress and execution status of an import job
   */
  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const status = await universalImportService.getJobStatus(jobId);
      return sendSuccess(res, HTTP_STATUS.OK, 'Import job status retrieved', status);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/bulk/:module/export
   * Generates and downloads sanitized Excel export (.xlsx)
   */
  async exportModule(req, res, next) {
    try {
      const { module } = req.params;

      const { buffer, filename } = await universalExportService.exportModule({
        module,
        query: req.query,
        user: req.user
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/bulk/history
   * Lists past import jobs
   */
  async getHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const module = req.query.module || null;

      const history = await universalImportService.getImportHistory({
        page,
        limit,
        module
      });

      return sendSuccess(res, HTTP_STATUS.OK, 'Import history retrieved successfully', history);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/bulk/history/:id/report
   * Downloads execution report (.xlsx) for a specific import job
   */
  async downloadReport(req, res, next) {
    try {
      const { id } = req.params;
      const buffer = await universalImportService.getJobErrorReport(id);

      const filename = `import_report_${id}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  }
};

export default adminImportExportController;
