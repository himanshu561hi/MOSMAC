import crypto from 'crypto';
import path from 'path';
import JSZip from 'jszip';
import { ApiError } from '../../utils/ApiError.js';

export const MAX_ZIP_SIZE_BYTES = 300 * 1024 * 1024; // 300 MB
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_COUNT = 2000; // max 2000 files

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

/**
 * Generates sanitized storage keys like: products/<SKU>/<position>-<hash>.<ext>
 */
export function generateStorageKey(sku, position, contentHash, ext = '.jpg') {
  const cleanSku = String(sku || 'unknown').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const shortHash = (contentHash || '').slice(0, 10);
  const cleanExt = (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase();
  return `products/${cleanSku}/${position}-${shortHash}${cleanExt}`;
}

/**
 * Checks real magic byte file signatures to prevent disguised executables
 */
export function detectRealMimeType(buffer) {
  if (!buffer || buffer.length < 8) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // AVIF: ....ftypavif
  if (buffer.length >= 12) {
    const brand = buffer.toString('ascii', 4, 12);
    if (brand.includes('ftypavif') || brand.includes('ftypavis')) {
      return 'image/avif';
    }
  }

  return null;
}

/**
 * Natural sort helper for gallery images:
 * image_2 comes before image_3, image_3 before image_10
 */
export function naturalSortKey(filename) {
  const baseName = path.basename(filename, path.extname(filename)).toLowerCase();
  
  // If main.*, force it to absolute first (-1)
  if (baseName === 'main') return [-1];

  // Extract number after image_ or any trailing numbers
  const match = baseName.match(/^(?:image_?)?(\d+)$/i) || baseName.match(/(\d+)/);
  if (match) {
    return [0, parseInt(match[1], 10), baseName];
  }

  return [1, baseName];
}

export function compareGalleryImages(a, b) {
  const keyA = naturalSortKey(a.filename);
  const keyB = naturalSortKey(b.filename);

  if (keyA[0] !== keyB[0]) return keyA[0] - keyB[0];
  if (keyA[0] === 0) {
    if (keyA[1] !== keyB[1]) return keyA[1] - keyB[1];
    return keyA[2].localeCompare(keyB[2]);
  }
  return keyA[1].localeCompare(keyB[1]);
}

/**
 * Parses and securely validates an uploaded ZIP file of product images
 * @param {Buffer} zipBuffer 
 * @returns {Promise<{ skuFolders: Map<string, Array<{ filename: string, buffer: Buffer, contentHash: string, isMain: boolean }>>, warnings: Array<string>, orphanFolderNames: Array<string> }>}
 */
export async function parseAndValidateImagesZip(zipBuffer) {
  if (!zipBuffer || zipBuffer.length === 0) {
    throw ApiError.badRequest('Empty or invalid images ZIP buffer provided.');
  }

  if (zipBuffer.length > MAX_ZIP_SIZE_BYTES) {
    throw ApiError.badRequest(
      `Images ZIP file size exceeds maximum permitted limit of ${MAX_ZIP_SIZE_BYTES / (1024 * 1024)} MB.`
    );
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch (err) {
    throw ApiError.badRequest(`Failed to read ZIP archive. File may be corrupt or not a valid zip: ${err.message}`);
  }

  const skuFolders = new Map(); // normalized SKU -> array of image entries
  const warnings = [];

  const entries = Object.keys(zip.files);
  if (entries.length > MAX_FILES_COUNT) {
    throw ApiError.badRequest(
      `Images ZIP exceeds maximum permitted file limit of ${MAX_FILES_COUNT} files (contained ${entries.length}).`
    );
  }

  for (const entryPath of entries) {
    const entry = zip.files[entryPath];

    // Security: Check for Zip-Slip attacks (path traversal)
    if (
      entryPath.includes('..') ||
      entryPath.startsWith('/') ||
      entryPath.startsWith('\\') ||
      path.isAbsolute(entryPath)
    ) {
      throw ApiError.badRequest(
        `Security violation: ZIP file contains illegal path traversal attempt '${entryPath}'.`
      );
    }

    // Ignore directory records
    if (entry.dir) continue;

    // Normalize path separators
    const normalizedPath = entryPath.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/').filter(Boolean);

    // Filter out OS artifacts and hidden files
    const filename = pathParts[pathParts.length - 1];
    if (
      pathParts.some((part) => part.startsWith('.') || part === '__MACOSX' || part === 'Thumbs.db') ||
      filename.startsWith('.')
    ) {
      continue;
    }

    // Structure expected: PRODUCT_IMAGES/<SKU>/<filename>
    // Tolerant structure: could also be <SKU>/<filename> if user zipped folder contents directly
    let sku = null;
    if (pathParts.length >= 3 && pathParts[0].toUpperCase() === 'PRODUCT_IMAGES') {
      sku = pathParts[1].trim().toUpperCase();
    } else if (pathParts.length === 2) {
      sku = pathParts[0].trim().toUpperCase();
    } else {
      // Ignored non-conforming path
      continue;
    }

    if (!sku) continue;

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      warnings.push(`Ignored unsupported file format '${filename}' in folder '${sku}'`);
      continue;
    }

    const fileBuffer = await entry.async('nodebuffer');

    if (fileBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      warnings.push(
        `Image '${filename}' for SKU '${sku}' exceeds max single image size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB and was skipped.`
      );
      continue;
    }

    const realMime = detectRealMimeType(fileBuffer);
    if (!realMime) {
      warnings.push(
        `Image '${filename}' for SKU '${sku}' has invalid or corrupt file signature and was skipped.`
      );
      continue;
    }

    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const baseName = path.basename(filename, ext).toLowerCase();
    const isMain = baseName === 'main';

    if (!skuFolders.has(sku)) {
      skuFolders.set(sku, []);
    }

    skuFolders.get(sku).push({
      entryPath,
      filename,
      ext,
      mimeType: realMime,
      buffer: fileBuffer,
      contentHash,
      isMain
    });
  }

  let totalImagesFound = 0;
  // Sort images per SKU: main first, then natural order of image_N
  for (const [sku, images] of skuFolders.entries()) {
    images.sort(compareGalleryImages);
    totalImagesFound += images.length;

    // Check if main.* exists
    const hasMain = images.some((img) => img.isMain);
    if (!hasMain) {
      warnings.push(`Folder for SKU '${sku}' does not contain a 'main' image (e.g. main.jpg).`);
      // Promote the first sorted image as primary fallback
      if (images.length > 0) {
        images[0].isMain = true;
      }
    }
  }

  return {
    skuFolders,
    warnings,
    totalImagesFound,
    skuFoldersCount: skuFolders.size
  };
}

export default {
  MAX_ZIP_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_FILES_COUNT,
  ALLOWED_IMAGE_EXTENSIONS,
  generateStorageKey,
  detectRealMimeType,
  naturalSortKey,
  compareGalleryImages,
  parseAndValidateImagesZip
};
