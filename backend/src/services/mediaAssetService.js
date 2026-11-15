import { MediaAsset } from '../models/MediaAsset.js';
import { Product } from '../models/Product.js';
import { Banner } from '../models/Banner.js';
import { ContentPage } from '../models/ContentPage.js';
import { deleteCloudinaryAsset } from '../integrations/cloudinaryAdapter.js';
import { ApiError } from '../utils/ApiError.js';
import { auditService } from './auditService.js';

export const mediaAssetService = {
  /**
   * Records newly uploaded asset metadata into the database
   */
  async recordAsset(data, staffUser) {
    const existing = await MediaAsset.findOne({ publicId: data.publicId });
    if (existing) {
      return existing;
    }

    const asset = await MediaAsset.create({
      ...data,
      uploadedBy: staffUser ? staffUser._id : null
    });

    return asset;
  },

  /**
   * List paginated media assets with folder filtering and tag/filename search
   */
  async listAssets({ page = 1, limit = 24, folder, search } = {}) {
    const query = {};
    if (folder) query.folder = folder;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ publicId: searchRegex }, { altText: searchRegex }, { tags: searchRegex }];
    }

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      MediaAsset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MediaAsset.countDocuments(query)
    ]);

    return {
      assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Safely deletes an asset from Cloudinary and database, enforcing reference safety checks
   */
  async deleteAsset(id, staffUser, { force = false } = {}) {
    const asset = await MediaAsset.findById(id);
    if (!asset) throw ApiError.notFound('Media asset not found');

    if (!force) {
      // 1. Check Product references
      const productRefCount = await Product.countDocuments({
        $or: [
          { 'images.publicId': asset.publicId },
          { 'images.url': asset.url }
        ]
      });

      if (productRefCount > 0) {
        throw ApiError.badRequest(
          `Cannot delete asset: it is currently in use and referenced by ${productRefCount} product(s).`
        );
      }

      // 2. Check Banner references
      const bannerRefCount = await Banner.countDocuments({
        $or: [
          { desktopImageUrl: asset.url },
          { mobileImageUrl: asset.url }
        ]
      });

      if (bannerRefCount > 0) {
        throw ApiError.badRequest(
          `Cannot delete asset: it is currently in use and referenced by ${bannerRefCount} banner(s).`
        );
      }

      // 3. Check ContentPage references
      const pageRefCount = await ContentPage.countDocuments({
        $or: [
          { featuredImageUrl: asset.url },
          { content: new RegExp(asset.publicId, 'i') }
        ]
      });

      if (pageRefCount > 0) {
        throw ApiError.badRequest(
          `Cannot delete asset: it is currently in use and referenced by ${pageRefCount} content page(s).`
        );
      }
    }

    // Delete from Cloudinary
    await deleteCloudinaryAsset(asset.publicId);

    // Delete from database
    await MediaAsset.findByIdAndDelete(id);

    await auditService.log({
      actorId: staffUser._id,
      actorRole: staffUser.role,
      actorEmail: staffUser.email,
      action: 'MEDIA_ASSET_DELETED',
      resourceType: 'MediaAsset',
      resourceId: id,
      notes: `Deleted media asset: ${asset.publicId}`
    });

    return { success: true, message: 'Media asset deleted successfully' };
  }
};

export default mediaAssetService;
