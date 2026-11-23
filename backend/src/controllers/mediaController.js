import {
  generateSignedUploadParams,
  deleteCloudinaryAsset,
  validateImageUploadRequest,
  uploadFileToCloudinary
} from '../integrations/cloudinaryAdapter.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiError } from '../utils/ApiError.js';
import { mediaAssetService } from '../services/mediaAssetService.js';
import logger from '../utils/logger.js';

export async function uploadImages(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      throw ApiError.badRequest('No image files provided for upload');
    }

    const folder = req.body?.folder || 'ecommerce/products';
    const uploadedImages = [];

    for (const file of files) {
      validateImageUploadRequest(file.mimetype, file.size);
      const uploaded = await uploadFileToCloudinary(file.buffer, file.originalname, folder);

      // Record in MediaAsset registry
      try {
        await mediaAssetService.recordAsset(
          {
            publicId: uploaded.publicId,
            url: uploaded.url,
            secureUrl: uploaded.url,
            format: uploaded.format,
            bytes: uploaded.bytes,
            width: uploaded.width || 0,
            height: uploaded.height || 0,
            altText: uploaded.alt || file.originalname,
            folder
          },
          req.user
        );
      } catch (assetErr) {
        logger.warn('Failed to record media asset:', assetErr.message);
      }

      uploadedImages.push(uploaded);
    }

    return sendSuccess(res, HTTP_STATUS.CREATED, 'Images uploaded successfully', {
      images: uploadedImages
    });
  } catch (error) {
    next(error);
  }
}

export async function getUploadSignature(req, res, next) {
  try {
    const { folder, mimeType, sizeBytes } = req.query;

    if (mimeType && sizeBytes) {
      validateImageUploadRequest(mimeType, parseInt(sizeBytes, 10));
    }

    const signedParams = generateSignedUploadParams(folder || 'ecommerce/products');

    return sendSuccess(res, HTTP_STATUS.OK, 'Signed upload parameters generated', signedParams);
  } catch (error) {
    next(error);
  }
}

export async function deleteAsset(req, res, next) {
  try {
    const { publicId } = req.body;
    const result = await deleteCloudinaryAsset(publicId);

    return sendSuccess(res, HTTP_STATUS.OK, 'Asset removal processed', result);
  } catch (error) {
    next(error);
  }
}

export default {
  uploadImages,
  getUploadSignature,
  deleteAsset
};

