import { homepageSectionService } from '../services/homepageSectionService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiError } from '../utils/ApiError.js';

export const homepageSectionController = {
  // ==========================================
  // SECTION CRUD & STATUS
  // ==========================================

  async listAdminSections(req, res, next) {
    try {
      const sections = await homepageSectionService.listAdminSections();
      return sendSuccess(res, HTTP_STATUS.OK, 'Homepage sections retrieved', { sections });
    } catch (err) {
      next(err);
    }
  },

  async getSectionById(req, res, next) {
    try {
      const section = await homepageSectionService.getSectionById(req.params.id);
      return sendSuccess(res, HTTP_STATUS.OK, 'Homepage section retrieved', { section });
    } catch (err) {
      next(err);
    }
  },

  async createSection(req, res, next) {
    try {
      const section = await homepageSectionService.createSection(req.body, req.user);
      return sendSuccess(res, HTTP_STATUS.CREATED, 'Homepage section created successfully', { section });
    } catch (err) {
      next(err);
    }
  },

  async updateSection(req, res, next) {
    try {
      const section = await homepageSectionService.updateSection(req.params.id, req.body, req.user);
      return sendSuccess(res, HTTP_STATUS.OK, 'Homepage section updated successfully', { section });
    } catch (err) {
      next(err);
    }
  },

  async deleteSection(req, res, next) {
    try {
      const result = await homepageSectionService.deleteSection(req.params.id, req.user);
      return sendSuccess(res, HTTP_STATUS.OK, 'Homepage section deleted successfully', result);
    } catch (err) {
      next(err);
    }
  },

  async toggleSectionStatus(req, res, next) {
    try {
      const section = await homepageSectionService.toggleSectionStatus(
        req.params.id,
        req.body.isActive,
        req.user
      );
      return sendSuccess(res, HTTP_STATUS.OK, `Section ${section.isActive ? 'enabled' : 'disabled'} successfully`, { section });
    } catch (err) {
      next(err);
    }
  },

  async reorderSections(req, res, next) {
    try {
      const sections = await homepageSectionService.reorderSections(req.body.sections, req.user);
      return sendSuccess(res, HTTP_STATUS.OK, 'Homepage sections reordered successfully', { sections });
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // PRODUCT ASSIGNMENTS & REORDERING
  // ==========================================

  async getSectionProducts(req, res, next) {
    try {
      const products = await homepageSectionService.getSectionProducts(req.params.id);
      return sendSuccess(res, HTTP_STATUS.OK, 'Section products retrieved', { products });
    } catch (err) {
      next(err);
    }
  },

  async assignProducts(req, res, next) {
    try {
      const products = await homepageSectionService.assignProducts(req.params.id, req.body, req.user);
      return sendSuccess(res, HTTP_STATUS.OK, 'Products assigned to section successfully', { products });
    } catch (err) {
      next(err);
    }
  },

  async updateSectionProducts(req, res, next) {
    try {
      const products = await homepageSectionService.updateSectionProducts(
        req.params.id,
        req.body.products,
        req.user
      );
      return sendSuccess(res, HTTP_STATUS.OK, 'Section products and order updated successfully', { products });
    } catch (err) {
      next(err);
    }
  },

  async removeProductFromSection(req, res, next) {
    try {
      const result = await homepageSectionService.removeProductFromSection(
        req.params.id,
        req.params.productId,
        req.user
      );
      return sendSuccess(res, HTTP_STATUS.OK, 'Product removed from section successfully', result);
    } catch (err) {
      next(err);
    }
  },

  async searchProducts(req, res, next) {
    try {
      const result = await homepageSectionService.searchProducts({
        query: req.query.search || req.query.q || req.query.query || '',
        category: req.query.category || '',
        brand: req.query.brand || '',
        status: req.query.status || '',
        page: req.query.page || 1,
        limit: req.query.limit || 10
      });
      return sendSuccess(res, HTTP_STATUS.OK, 'Products retrieved for selector', result);
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // EXCEL IMPORT & EXPORT
  // ==========================================

  async downloadSampleExcel(req, res, next) {
    try {
      const buffer = await homepageSectionService.generateSampleExcel();
      const filename = 'homepage_sections_sample_template.xlsx';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },

  async validateExcelUpload(req, res, next) {
    try {
      const excelFile = req.file || req.files?.file?.[0];
      if (!excelFile || !excelFile.buffer) {
        throw ApiError.badRequest('Please upload an Excel (.xlsx) file.');
      }

      const preview = await homepageSectionService.validateExcelImport(excelFile.buffer);
      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        `Excel validation completed: ${preview.validRows} valid rows, ${preview.invalidRows} invalid rows.`,
        preview
      );
    } catch (err) {
      next(err);
    }
  },

  async executeExcelImport(req, res, next) {
    try {
      const { validItems, mode } = req.body;
      const result = await homepageSectionService.executeExcelImport({ validItems, mode }, req.user);
      return sendSuccess(res, HTTP_STATUS.OK, result.message, result);
    } catch (err) {
      next(err);
    }
  },

  async exportAssignmentsExcel(req, res, next) {
    try {
      const buffer = await homepageSectionService.exportAssignmentsExcel();
      const filename = `homepage_section_assignments_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },

  // ==========================================
  // PUBLIC STOREFRONT ENDPOINT
  // ==========================================

  async getPublicStorefrontSections(req, res, next) {
    try {
      const sections = await homepageSectionService.getPublicStorefrontSections();
      return sendSuccess(res, HTTP_STATUS.OK, 'Active homepage sections retrieved', { sections });
    } catch (err) {
      next(err);
    }
  }
};

export default homepageSectionController;
