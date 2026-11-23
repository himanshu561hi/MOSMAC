import { Router } from 'express';
import multer from 'multer';
import { getUploadSignature, deleteAsset, uploadImages } from '../controllers/mediaController.js';
import * as mediaAssetController from '../controllers/mediaAssetController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../constants/roles.js';
import { recordMediaAssetSchema } from '../validators/cmsValidators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB per file
  }
});

export const mediaRoutes = Router();

// Only authenticated staff can request signed upload parameters or delete assets
mediaRoutes.use(authenticate);
mediaRoutes.use(authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER));

mediaRoutes.post('/upload', upload.array('images', 10), uploadImages);
mediaRoutes.get('/signature', getUploadSignature);
mediaRoutes.post('/delete', deleteAsset);

// Media Library Asset Registry
mediaRoutes.get('/assets', mediaAssetController.listAssets);
mediaRoutes.post('/assets', validate(recordMediaAssetSchema), mediaAssetController.recordAsset);
mediaRoutes.delete('/assets/:id', mediaAssetController.deleteAsset);

export default mediaRoutes;


