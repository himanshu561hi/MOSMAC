import { mediaAssetService } from '../services/mediaAssetService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export async function recordAsset(req, res, next) {
  try {
    const asset = await mediaAssetService.recordAsset(req.body, req.user);
    return sendSuccess(res, HTTP_STATUS.CREATED, 'Media asset recorded', { asset });
  } catch (error) {
    next(error);
  }
}

export async function listAssets(req, res, next) {
  try {
    const { page, limit, folder, search } = req.query;
    const result = await mediaAssetService.listAssets({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 24,
      folder,
      search
    });
    return sendSuccess(res, HTTP_STATUS.OK, 'Media library assets retrieved', result);
  } catch (error) {
    next(error);
  }
}

export async function deleteAsset(req, res, next) {
  try {
    const { id } = req.params;
    const { force } = req.query;
    const result = await mediaAssetService.deleteAsset(id, req.user, { force: force === 'true' });
    return sendSuccess(res, HTTP_STATUS.OK, 'Media asset deleted', result);
  } catch (error) {
    next(error);
  }
}

export default {
  recordAsset,
  listAssets,
  deleteAsset
};
