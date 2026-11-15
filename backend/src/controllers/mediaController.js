import {
  generateSignedUploadParams,
  deleteCloudinaryAsset,
  validateImageUploadRequest
} from '../integrations/cloudinaryAdapter.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

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
  getUploadSignature,
  deleteAsset
};

