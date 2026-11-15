import crypto from 'crypto';
import { MODULE_DEFINITIONS } from './moduleRegistry.js';
import { excelParser } from './excelParser.js';
import { excelGenerator } from './excelGenerator.js';
import { ImportJob } from '../../models/ImportJob.js';
import { Category } from '../../models/Category.js';
import { Brand } from '../../models/Brand.js';
import { Product } from '../../models/Product.js';
import { Coupon } from '../../models/Coupon.js';
import { ContentPage } from '../../models/ContentPage.js';
import { FAQ } from '../../models/FAQ.js';
import { Banner } from '../../models/Banner.js';
import { AttributeDefinition } from '../../models/AttributeDefinition.js';
import { auditService } from '../auditService.js';
import { ApiError } from '../../utils/ApiError.js';

export const universalImportService = {
  /**
   * Validates an uploaded Excel file and creates a validated ImportJob preview
   */
  async validateUpload({ module, buffer, originalname, user }) {
    const moduleDef = MODULE_DEFINITIONS[module];
    if (!moduleDef) {
      throw ApiError.badRequest(`Unknown module: ${module}`);
    }

    if (!moduleDef.supportsImport) {
      throw ApiError.forbidden(
        `Bulk import is strictly forbidden for module '${module}' due to security or transactional constraints.`
      );
    }

    const fileChecksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Parse the Excel workbook
    const { rows } = await excelParser.parseBuffer(buffer, moduleDef);

    // Build module-specific context caches for efficient fast validation
    const context = await this._buildValidationContext(module, rows);

    const errors = [];
    const previewRows = [];
    const stagedData = [];
    let validRows = 0;
    let invalidRows = 0;
    let existingRows = 0;
    let newRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = row._rowNumber || i + 2;

      const result = await moduleDef.validateRow(row, rowIndex, context);

      if (result.valid) {
        validRows++;
        if (result.isExisting) {
          existingRows++;
        } else {
          newRows++;
        }
        stagedData.push({
          rowNumber: rowIndex,
          data: result.sanitizedData,
          isExisting: result.isExisting
        });
      } else {
        invalidRows++;
        result.errors.forEach((err) => {
          errors.push({
            row: rowIndex,
            column: err.column,
            value: String(err.value || ''),
            reason: err.reason,
            suggestion: err.suggestion || ''
          });
        });
      }

      // Keep up to 50 preview rows
      if (previewRows.length < 50) {
        previewRows.push({
          _rowNumber: rowIndex,
          _valid: result.valid,
          _isExisting: result.isExisting,
          ...row
        });
      }
    }

    // Create persistent ImportJob
    const job = await ImportJob.create({
      module,
      filename: originalname || 'import.xlsx',
      fileChecksum,
      templateVersion: '1.0.0',
      importMode: 'create_only',
      status: 'validated',
      totalRows: rows.length,
      validRows,
      invalidRows,
      existingRows,
      newRows,
      errors,
      previewRows,
      stagedData,
      importedBy: user._id,
      importedByEmail: user.email,
      summary: `Validated ${rows.length} rows: ${validRows} valid (${newRows} new, ${existingRows} existing), ${invalidRows} invalid.`
    });

    return {
      jobId: job._id,
      module,
      filename: job.filename,
      totalRows: rows.length,
      validRows,
      invalidRows,
      existingRows,
      newRows,
      errors: errors.slice(0, 100), // return top 100 errors in response envelope
      previewRows,
      importModes: ['create_only', 'update_existing', 'create_update'],
      defaultMode: 'create_only'
    };
  },

  /**
   * Executes a validated ImportJob with the selected mode
   */
  async executeImport({ jobId, importMode = 'create_only', user }) {
    if (!['create_only', 'update_existing', 'create_update'].includes(importMode)) {
      throw ApiError.badRequest(`Invalid import mode: ${importMode}`);
    }

    const job = await ImportJob.findById(jobId);
    if (!job) {
      throw ApiError.notFound('Import job not found');
    }

    if (job.status === 'completed') {
      throw ApiError.badRequest('This import job has already been completed.');
    }

    if (job.status === 'processing') {
      throw ApiError.badRequest('This import job is currently being processed.');
    }

    const moduleDef = MODULE_DEFINITIONS[job.module];
    if (!moduleDef || !moduleDef.supportsImport) {
      throw ApiError.forbidden(`Import is not supported for ${job.module}`);
    }

    job.status = 'processing';
    job.importMode = importMode;
    await job.save();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const executionErrors = [...job.errors];

    // Process staged data in safe bounded chunks of 50
    const chunkSize = 50;
    const items = job.stagedData || [];

    for (let c = 0; c < items.length; c += chunkSize) {
      const chunk = items.slice(c, c + chunkSize);

      for (const item of chunk) {
        try {
          const outcome = await moduleDef.executeRow({
            data: item.data,
            isExisting: item.isExisting,
            mode: importMode,
            user
          });

          if (outcome.action === 'created') {
            createdCount++;
          } else if (outcome.action === 'updated') {
            updatedCount++;
          } else {
            skippedCount++;
          }
        } catch (rowErr) {
          skippedCount++;
          executionErrors.push({
            row: item.rowNumber,
            column: 'Execution',
            value: '',
            reason: rowErr.message || 'Database write error',
            suggestion: 'Verify record constraints and retry'
          });
        }
      }
    }

    job.status = 'completed';
    job.createdCount = createdCount;
    job.updatedCount = updatedCount;
    job.skippedCount = skippedCount;
    job.errors = executionErrors;
    job.completedAt = new Date();
    job.summary = `Execution completed with mode '${importMode}': ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`;
    await job.save();

    // Audit Log recording
    await auditService.log({
      actorId: user._id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'BULK_EXCEL_IMPORT',
      resourceType: job.module,
      resourceId: String(job._id),
      changes: {
        module: job.module,
        mode: importMode,
        total: job.totalRows,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount
      },
      notes: `Bulk import executed for ${job.module} (${job.filename})`
    });

    return {
      jobId: job._id,
      module: job.module,
      status: job.status,
      importMode,
      totalRows: job.totalRows,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount: executionErrors.length,
      summary: job.summary
    };
  },

  /**
   * Builds in-memory lookup maps for fast batch validation
   */
  async _buildValidationContext(module, rows) {
    const context = {};

    if (module === 'products') {
      const [categories, brands] = await Promise.all([
        Category.find({}).select('slug name').lean(),
        Brand.find({}).select('slug name').lean()
      ]);

      context.categoryMap = {};
      categories.forEach((c) => {
        context.categoryMap[c.slug.toLowerCase()] = c;
      });

      context.brandMap = {};
      brands.forEach((b) => {
        context.brandMap[b.slug.toLowerCase()] = b;
      });

      // Existing SKUs
      const skus = rows.map((r) => String(r.sku || '').trim().toUpperCase()).filter(Boolean);
      const existingProducts = await Product.find({ 'variants.sku': { $in: skus } })
        .select('variants.sku')
        .lean();

      context.existingProductsBySku = {};
      existingProducts.forEach((p) => {
        (p.variants || []).forEach((v) => {
          context.existingProductsBySku[v.sku] = true;
        });
      });
    } else if (module === 'categories') {
      const categories = await Category.find({}).select('slug name parentId').lean();
      context.categoryMap = {};
      context.existingCategoriesBySlug = {};
      categories.forEach((c) => {
        context.categoryMap[c.slug.toLowerCase()] = c;
        context.existingCategoriesBySlug[c.slug.toLowerCase()] = c;
      });
    } else if (module === 'brands') {
      const brands = await Brand.find({}).select('slug name').lean();
      context.existingBrandsBySlug = {};
      brands.forEach((b) => {
        context.existingBrandsBySlug[b.slug.toLowerCase()] = b;
      });
    } else if (module === 'attributes') {
      const categories = await Category.find({}).select('slug name').lean();
      context.categoryMap = {};
      categories.forEach((c) => {
        context.categoryMap[c.slug.toLowerCase()] = c;
      });
      const attrs = await AttributeDefinition.find({}).select('code').lean();
      context.existingAttributesByCode = {};
      attrs.forEach((a) => {
        context.existingAttributesByCode[a.code.toLowerCase()] = a;
      });
    } else if (module === 'inventory') {
      const skus = rows.map((r) => String(r.sku || '').trim().toUpperCase()).filter(Boolean);
      const products = await Product.find({ 'variants.sku': { $in: skus } })
        .select('variants.sku variants.stockQuantity')
        .lean();

      context.skuMap = {};
      products.forEach((p) => {
        (p.variants || []).forEach((v) => {
          context.skuMap[v.sku] = { stockQuantity: v.stockQuantity };
        });
      });
    } else if (module === 'coupons') {
      const codes = rows.map((r) => String(r.code || '').trim().toUpperCase()).filter(Boolean);
      const existing = await Coupon.find({ code: { $in: codes } }).select('code').lean();
      context.existingCouponsByCode = {};
      existing.forEach((c) => {
        context.existingCouponsByCode[c.code] = c;
      });
    } else if (module === 'cms-pages') {
      const slugs = rows.map((r) => String(r.slug || '').trim().toLowerCase()).filter(Boolean);
      const existing = await ContentPage.find({ slug: { $in: slugs } }).select('slug').lean();
      context.existingPagesBySlug = {};
      existing.forEach((p) => {
        context.existingPagesBySlug[p.slug] = p;
      });
    } else if (module === 'faqs') {
      const faqs = await FAQ.find({}).select('question').lean();
      context.existingFaqsByQuestion = {};
      faqs.forEach((f) => {
        context.existingFaqsByQuestion[f.question.toLowerCase()] = f;
      });
    } else if (module === 'banners') {
      const banners = await Banner.find({}).select('title').lean();
      context.existingBannersByTitle = {};
      banners.forEach((b) => {
        context.existingBannersByTitle[b.title.toLowerCase()] = b;
      });
    }

    return context;
  },

  /**
   * Retrieves import jobs history
   */
  async getImportHistory({ page = 1, limit = 20, module } = {}) {
    const query = {};
    if (module) query.module = module;

    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      ImportJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-stagedData -previewRows')
        .lean(),
      ImportJob.countDocuments(query)
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Generates a downloadable error & audit report (.xlsx buffer)
   */
  async getJobErrorReport(jobId) {
    const job = await ImportJob.findById(jobId).lean();
    if (!job) {
      throw ApiError.notFound('Import job not found');
    }
    return await excelGenerator.generateErrorReport(job);
  }
};

export default universalImportService;
