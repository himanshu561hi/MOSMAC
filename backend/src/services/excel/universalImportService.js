import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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
import { parseAndValidateImagesZip, generateStorageKey } from './zipImageExtractor.js';
import { uploadFileToCloudinary, deleteCloudinaryAsset } from '../../integrations/cloudinaryAdapter.js';

/**
 * Topologically sorts categories so parent categories are created/updated before child categories
 * Detects circular references with detailed error reporting
 */
export function sortCategoriesTopologically(items) {
  const itemMap = new Map();
  items.forEach((item) => {
    const s = String(item.data?.slug || '').trim().toLowerCase();
    if (s) itemMap.set(s, item);
  });

  const visited = new Set();
  const visiting = new Set();
  const sorted = [];
  const cycleErrors = [];

  function visit(slug, chain = []) {
    if (visiting.has(slug)) {
      cycleErrors.push(`Circular category hierarchy detected: ${[...chain, slug].join(' -> ')}`);
      return;
    }
    if (visited.has(slug)) return;

    visiting.add(slug);
    const item = itemMap.get(slug);
    if (item && item.data?.parentSlug) {
      const pSlug = String(item.data.parentSlug).trim().toLowerCase();
      if (itemMap.has(pSlug)) {
        visit(pSlug, [...chain, slug]);
      }
    }

    visiting.delete(slug);
    visited.add(slug);
    if (item) {
      sorted.push(item);
    }
  }

  items.forEach((item) => {
    const slug = String(item.data?.slug || '').trim().toLowerCase();
    if (!visited.has(slug)) {
      visit(slug);
    }
  });

  return { sorted, cycleErrors };
}

export const universalImportService = {
  /**
   * Validates an uploaded Excel file (and optional Images ZIP) and creates a validated ImportJob preview
   */
  async validateUpload({ module, buffer, originalname, imagesZipBuffer = null, imagesZipName = null, user }) {
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

    // If categories module, perform pre-validation cycle check on sheet rows
    if (module === 'categories') {
      const pseudoItems = rows.map((r, i) => ({
        data: {
          slug: String(r.slug || '').trim().toLowerCase(),
          parentSlug: String(r.parentSlug || '').trim().toLowerCase()
        },
        rowNumber: r._rowNumber || i + 2
      }));
      const { cycleErrors } = sortCategoriesTopologically(pseudoItems);
      if (cycleErrors.length > 0) {
        cycleErrors.forEach((err) => {
          context.preValidationErrors = context.preValidationErrors || [];
          context.preValidationErrors.push({
            row: 0,
            column: 'Parent Slug',
            value: '',
            reason: err,
            suggestion: 'Ensure parent-child hierarchy is acyclic'
          });
        });
      }
    }

    // Optional Images ZIP validation (for products module)
    let zipResult = null;
    let stagedZipPath = '';
    const imageWarnings = [];

    if (module === 'products' && imagesZipBuffer && imagesZipBuffer.length > 0) {
      zipResult = await parseAndValidateImagesZip(imagesZipBuffer);
      imageWarnings.push(...zipResult.warnings);

      // Stage ZIP file to a temporary directory for step 2 execution
      const tmpDir = path.join(process.cwd(), 'tmp/imports');
      await fs.promises.mkdir(tmpDir, { recursive: true });
      stagedZipPath = path.join(
        tmpDir,
        `import_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.zip`
      );
      await fs.promises.writeFile(stagedZipPath, imagesZipBuffer);
    }

    const errors = [...(context.preValidationErrors || [])];
    const previewRows = [];
    const stagedData = [];
    let validRows = 0;
    let invalidRows = 0;
    let existingRows = 0;
    let newRows = 0;

    // Track missing reference slugs for consolidated error reporting
    const missingCategories = new Set();
    const missingBrands = new Set();

    // Track matching between Excel SKUs and ZIP SKU folders
    const excelSkusSet = new Set();
    let productsWithImages = 0;
    let excelSkusWithoutImages = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = row._rowNumber || i + 2;

      // Track SKU
      const rowSku = String(row.sku || '').trim().toUpperCase();
      if (rowSku) {
        excelSkusSet.add(rowSku);
      }

      // Check category & brand existence for consolidated reporting
      if (module === 'products') {
        const catSlug = String(row.category || '').trim().toLowerCase();
        if (catSlug && (!context.categoryMap || !context.categoryMap[catSlug])) {
          missingCategories.add(catSlug);
        }
        const brandSlug = String(row.brand || '').trim().toLowerCase();
        if (brandSlug && (!context.brandMap || !context.brandMap[brandSlug])) {
          missingBrands.add(brandSlug);
        }
      }

      const result = await moduleDef.validateRow(row, rowIndex, context);

      // Attach image preview metrics if images ZIP was provided
      let rowImagesCount = 0;
      let rowImagesSummary = '—';
      if (zipResult && zipResult.skuFolders) {
        if (rowSku && zipResult.skuFolders.has(rowSku)) {
          const imgs = zipResult.skuFolders.get(rowSku);
          rowImagesCount = imgs.length;
          const hasMain = imgs.some((img) => img.isMain);
          rowImagesSummary = `${imgs.length} image(s)${hasMain ? ', main.jpg OK' : ', fallback primary'}`;
          productsWithImages++;
        } else if (rowSku) {
          rowImagesSummary = 'No folder in ZIP';
          excelSkusWithoutImages++;
          imageWarnings.push(`Product SKU '${rowSku}' (row ${rowIndex}) has no matching folder in the images ZIP.`);
        }
      }

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

      // Keep up to 50 preview rows for UI preview table
      if (previewRows.length < 50) {
        previewRows.push({
          _rowNumber: rowIndex,
          _valid: result.valid,
          _isExisting: result.isExisting,
          _imagesCount: rowImagesCount,
          _imagesSummary: rowImagesSummary,
          ...row
        });
      }
    }

    // Consolidated missing category/brand errors reporting
    if (missingCategories.size > 0) {
      const missingList = Array.from(missingCategories).join(', ');
      errors.unshift({
        row: 0,
        column: 'Category Slug',
        value: missingList,
        reason: `Consolidated Missing Categories: '${missingList}' do not exist in the database.`,
        suggestion: 'Create these categories in Admin -> Categories before importing products.'
      });
    }

    if (missingBrands.size > 0) {
      const missingList = Array.from(missingBrands).join(', ');
      errors.unshift({
        row: 0,
        column: 'Brand Slug',
        value: missingList,
        reason: `Consolidated Missing Brands: '${missingList}' do not exist in the database.`,
        suggestion: 'Create these brands in Admin -> Brands before importing products.'
      });
    }

    // Check for orphan ZIP folders (folders in ZIP with no corresponding product in Excel)
    let orphanFolders = [];
    if (zipResult && zipResult.skuFolders) {
      orphanFolders = Array.from(zipResult.skuFolders.keys()).filter((sku) => !excelSkusSet.has(sku));
      if (orphanFolders.length > 0) {
        imageWarnings.unshift(
          `Images ZIP contains ${orphanFolders.length} folder(s) with no matching product in the Excel sheet: ${orphanFolders.slice(0, 10).join(', ')}${orphanFolders.length > 10 ? '...' : ''}`
        );
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
      hasImagesZip: Boolean(imagesZipBuffer && imagesZipBuffer.length > 0),
      imagesZipFilename: imagesZipName || '',
      imagesZipStoragePath: stagedZipPath || '',
      imagesFound: zipResult ? zipResult.totalImagesFound : 0,
      skuFoldersFound: zipResult ? zipResult.skuFoldersCount : 0,
      productsWithImages,
      excelSkusWithoutImages,
      orphanFoldersCount: orphanFolders.length,
      orphanFolders,
      imageWarnings,
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
      hasImagesZip: job.hasImagesZip,
      imagesFound: job.imagesFound,
      skuFoldersFound: job.skuFoldersFound,
      productsWithImages: job.productsWithImages,
      excelSkusWithoutImages: job.excelSkusWithoutImages,
      orphanFoldersCount: job.orphanFoldersCount,
      orphanFolders: job.orphanFolders,
      imageWarnings: job.imageWarnings,
      errors: errors.slice(0, 100),
      previewRows,
      importModes: ['create_only', 'update_existing', 'create_update'],
      defaultMode: 'create_only'
    };
  },

  /**
   * Executes a validated ImportJob with the selected mode and optional image replacement
   */
  async executeImport({ jobId, importMode = 'create_only', replaceImages = false, user }) {
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
    job.replaceImages = Boolean(replaceImages);
    await job.save();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let imagesUploaded = 0;
    let imagesSkipped = 0;
    const executionErrors = [...job.errors];

    // Load staged ZIP if available
    let skuFolders = null;
    if (job.hasImagesZip && job.imagesZipStoragePath) {
      try {
        if (fs.existsSync(job.imagesZipStoragePath)) {
          const zipBuffer = await fs.promises.readFile(job.imagesZipStoragePath);
          const zipParsed = await parseAndValidateImagesZip(zipBuffer);
          skuFolders = zipParsed.skuFolders;
        }
      } catch (err) {
        console.warn('[Import Execution] Failed to load staged ZIP images:', err.message);
      }
    }

    let items = job.stagedData || [];

    // Topological sorting for categories to ensure parents are created before children
    let categoryExecutionContext = null;
    if (job.module === 'categories') {
      const { sorted, cycleErrors } = sortCategoriesTopologically(items);
      items = sorted;
      const baseContext = await this._buildValidationContext('categories', []);
      categoryExecutionContext = {
        createdCategories: new Map(),
        categoryMap: baseContext.categoryMap || {}
      };
      if (cycleErrors.length > 0) {
        cycleErrors.forEach((msg) => {
          executionErrors.push({
            row: 0,
            column: 'Parent Slug',
            value: '',
            reason: msg,
            suggestion: 'Break circular references'
          });
        });
      }
    }

    job.progressTotal = items.length;
    job.progressCurrent = 0;
    job.progressStep = `Starting import execution (${items.length} records)...`;
    await job.save();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const newlyUploadedUrls = [];

      try {
        // If products module with ZIP images: process & attach images per-row
        if (job.module === 'products' && skuFolders && item.data?.sku) {
          const sku = String(item.data.sku).trim().toUpperCase();

          if (skuFolders.has(sku)) {
            const folderImages = skuFolders.get(sku);

            // Fetch existing product images for duplicate hash check
            const existingProduct = await Product.findOne({ 'variants.sku': sku }).lean();
            const existingImages = existingProduct?.images || [];
            const existingHashes = new Set(
              existingImages.map((img) => img.contentHash).filter(Boolean)
            );

            const rowUploadedAssets = [];

            for (let imgIdx = 0; imgIdx < folderImages.length; imgIdx++) {
              const img = folderImages[imgIdx];

              // Idempotency: Skip files already attached to this product unless replaceImages is enabled
              if (!replaceImages && existingHashes.has(img.contentHash)) {
                imagesSkipped++;
                continue;
              }

              // Sanitized storage key: products/<SKU>/<position>-<hash>.<ext>
              const storageKey = generateStorageKey(sku, imgIdx + 1, img.contentHash, img.ext);

              // Upload to media storage (Cloudinary or local storage fallback)
              const uploadRes = await uploadFileToCloudinary(
                img.buffer,
                storageKey,
                `products/${sku}`
              );

              newlyUploadedUrls.push(uploadRes);
              imagesUploaded++;

              rowUploadedAssets.push({
                url: uploadRes.url,
                publicId: uploadRes.publicId,
                alt: img.filename,
                isPrimary: img.isMain,
                order: imgIdx,
                contentHash: img.contentHash
              });
            }

            // Merge newly uploaded images with existing images or Excel Image URLs
            let finalImages = [];
            if (replaceImages) {
              finalImages = [...rowUploadedAssets];
            } else {
              finalImages = [...existingImages, ...rowUploadedAssets];
            }

            // Merge with Excel "Image URLs" column if filled (never fail row, remove duplicates)
            if (Array.isArray(item.data.images) && item.data.images.length > 0) {
              const existingUrls = new Set(finalImages.map((im) => im.url.trim()));
              item.data.images.forEach((extImg) => {
                if (extImg.url && !existingUrls.has(extImg.url.trim())) {
                  existingUrls.add(extImg.url.trim());
                  finalImages.push({
                    url: extImg.url.trim(),
                    publicId: '',
                    alt: extImg.alt || item.data.title || 'Product Image',
                    isPrimary: false,
                    order: finalImages.length,
                    contentHash: ''
                  });
                }
              });
            }

            // Ensure main / primary image is index 0 with isPrimary = true
            if (finalImages.length > 0) {
              const primaryIdx = finalImages.findIndex((im) => im.isPrimary);
              if (primaryIdx > 0) {
                const [primaryItem] = finalImages.splice(primaryIdx, 1);
                finalImages.unshift(primaryItem);
              }
              finalImages.forEach((im, idx) => {
                im.order = idx;
                im.isPrimary = idx === 0;
              });
            }

            item.data.images = finalImages;
          }
        }

        // Execute row write
        const outcome = await moduleDef.executeRow({
          data: item.data,
          isExisting: item.isExisting,
          mode: importMode,
          user,
          context: categoryExecutionContext
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

        // Per-row isolation: Clean up newly uploaded files on row failure so no orphan files remain
        for (const asset of newlyUploadedUrls) {
          try {
            if (asset.publicId) {
              await deleteCloudinaryAsset(asset.publicId);
            }
            if (asset.url && asset.url.startsWith('/uploads/')) {
              const localFilePath = path.join(process.cwd(), 'public', asset.url);
              if (fs.existsSync(localFilePath)) {
                await fs.promises.unlink(localFilePath).catch(() => {});
              }
            }
          } catch (cleanupErr) {
            console.warn('[Row Failure Cleanup] Error deleting orphan asset:', cleanupErr.message);
          }
        }

        executionErrors.push({
          row: item.rowNumber,
          column: 'Execution',
          value: item.data?.sku || item.data?.slug || '',
          reason: rowErr.message || 'Database write error',
          suggestion: 'Verify record constraints and retry'
        });
      }

      // Progress reporting
      job.progressCurrent = i + 1;
      job.progressStep = `Processed record ${i + 1} of ${items.length}`;
      if ((i + 1) % 10 === 0 || i === items.length - 1) {
        await job.save();
      }
    }

    // Clean up temporary staged ZIP file on disk
    if (job.imagesZipStoragePath && fs.existsSync(job.imagesZipStoragePath)) {
      await fs.promises.unlink(job.imagesZipStoragePath).catch(() => {});
    }

    job.status = 'completed';
    job.createdCount = createdCount;
    job.updatedCount = updatedCount;
    job.skippedCount = skippedCount;
    job.imagesUploaded = imagesUploaded;
    job.imagesSkipped = imagesSkipped;
    job.errors = executionErrors;
    job.completedAt = new Date();
    job.summary = `Execution completed with mode '${importMode}': ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped. Images: ${imagesUploaded} uploaded, ${imagesSkipped} skipped.`;
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
        skipped: skippedCount,
        imagesUploaded,
        imagesSkipped
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
      imagesUploaded,
      imagesSkipped,
      errorCount: executionErrors.length,
      summary: job.summary
    };
  },

  /**
   * Retrieves live progress and execution status of an import job
   */
  async getJobStatus(jobId) {
    const job = await ImportJob.findById(jobId).lean();
    if (!job) {
      throw ApiError.notFound('Import job not found');
    }
    return {
      jobId: job._id,
      status: job.status,
      module: job.module,
      totalRows: job.totalRows,
      createdCount: job.createdCount,
      updatedCount: job.updatedCount,
      skippedCount: job.skippedCount,
      progressCurrent: job.progressCurrent,
      progressTotal: job.progressTotal,
      progressStep: job.progressStep,
      hasImagesZip: job.hasImagesZip,
      imagesFound: job.imagesFound,
      imagesUploaded: job.imagesUploaded,
      imagesSkipped: job.imagesSkipped,
      imageWarnings: job.imageWarnings,
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

      // In-sheet slugs for multi-level category resolution within the same file
      context.inSheetSlugs = new Set(
        rows.map((r) => String(r.slug || '').trim().toLowerCase()).filter(Boolean)
      );
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
