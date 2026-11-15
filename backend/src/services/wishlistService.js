import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { addItemToCart } from './cartService.js';

export async function getOrCreateWishlist({ userId = null, guestId = null }) {
  if (!userId && !guestId) {
    throw ApiError.badRequest('Either userId or guestId must be provided to access a wishlist');
  }

  const query = userId ? { userId } : { guestId };
  let wishlist = await Wishlist.findOne(query);

  if (!wishlist) {
    wishlist = await Wishlist.create({
      ...(userId ? { userId } : { guestId }),
      items: []
    });
  }

  return wishlist;
}

export async function getPopulatedWishlist({ userId = null, guestId = null }) {
  const wishlist = await getOrCreateWishlist({ userId, guestId });

  if (!wishlist.items || wishlist.items.length === 0) {
    return {
      _id: wishlist._id,
      userId: wishlist.userId,
      guestId: wishlist.guestId,
      items: [],
      itemCount: 0
    };
  }

  const productIds = wishlist.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } })
    .populate('categoryId', 'name slug')
    .populate('brandId', 'name slug');

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const populatedItems = [];

  for (const item of wishlist.items) {
    const product = productMap.get(item.productId.toString());
    if (!product || product.status !== 'published') {
      continue; // Skip unpublished or archived items
    }

    const primaryImg = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url || '';
    const totalStock = product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) ?? 0;

    populatedItems.push({
      _id: item._id,
      productId: product._id,
      title: product.title,
      slug: product.slug,
      sku: item.sku || product.variants?.[0]?.sku || '',
      basePrice: product.basePrice,
      baseMrp: product.baseMrp,
      discountPercent: product.baseMrp > product.basePrice ? Math.round(((product.baseMrp - product.basePrice) / product.baseMrp) * 100) : 0,
      imageUrl: primaryImg,
      categoryId: product.categoryId,
      brandId: product.brandId,
      isOutOfStock: totalStock <= 0,
      addedAt: item.addedAt
    });
  }

  return {
    _id: wishlist._id,
    userId: wishlist.userId,
    guestId: wishlist.guestId,
    items: populatedItems,
    itemCount: populatedItems.length
  };
}

export async function addToWishlist({ userId = null, guestId = null, productId, sku = '' }) {
  const product = await Product.findById(productId);
  if (!product || product.status !== 'published') {
    throw ApiError.badRequest('Product not found or unavailable');
  }

  const wishlist = await getOrCreateWishlist({ userId, guestId });
  const alreadyExists = wishlist.items.some(
    (item) => item.productId.toString() === productId.toString()
  );

  if (!alreadyExists) {
    wishlist.items.push({
      productId: product._id,
      sku: sku.trim().toUpperCase(),
      addedAt: new Date()
    });
    await wishlist.save();
  }

  return getPopulatedWishlist({ userId, guestId });
}

export async function removeFromWishlist({ userId = null, guestId = null, productId }) {
  const wishlist = await getOrCreateWishlist({ userId, guestId });
  wishlist.items = wishlist.items.filter(
    (item) => item.productId.toString() !== productId.toString()
  );
  await wishlist.save();

  return getPopulatedWishlist({ userId, guestId });
}

export async function moveItemToCart({ userId = null, guestId = null, productId, sku, quantity = 1 }) {
  // 1. Add to cart
  const cartResult = await addItemToCart({ userId, guestId, productId, sku, quantity });

  // 2. Remove from wishlist
  await removeFromWishlist({ userId, guestId, productId });

  const wishlistResult = await getPopulatedWishlist({ userId, guestId });

  return {
    cart: cartResult,
    wishlist: wishlistResult
  };
}

export async function mergeGuestWishlist({ userId, guestId }) {
  if (!userId || !guestId) return null;

  const guestWishlist = await Wishlist.findOne({ guestId });
  if (!guestWishlist || guestWishlist.items.length === 0) {
    if (guestWishlist) await Wishlist.deleteOne({ _id: guestWishlist._id });
    return getPopulatedWishlist({ userId });
  }

  const userWishlist = await getOrCreateWishlist({ userId });
  const existingProductIds = new Set(userWishlist.items.map((i) => i.productId.toString()));

  for (const guestItem of guestWishlist.items) {
    if (!existingProductIds.has(guestItem.productId.toString())) {
      userWishlist.items.push(guestItem);
      existingProductIds.add(guestItem.productId.toString());
    }
  }

  await userWishlist.save();
  await Wishlist.deleteOne({ _id: guestWishlist._id });

  return getPopulatedWishlist({ userId });
}

export default {
  getOrCreateWishlist,
  getPopulatedWishlist,
  addToWishlist,
  removeFromWishlist,
  moveItemToCart,
  mergeGuestWishlist
};
