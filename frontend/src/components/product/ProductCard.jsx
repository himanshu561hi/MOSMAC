import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Star, Package, Heart, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import { addToCart } from '@/store/slices/cartSlice';
import { setAuthModalOpen, setPendingAction, addToast } from '@/store/slices/uiSlice';

const EMPTY_ITEMS = [];

export function ProductCard({ product, className = '' }) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const wishlistItems = useSelector((state) => state.wishlist?.items) || EMPTY_ITEMS;
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const isInWishlist = wishlistItems.some((item) => {
    const pId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
    return pId === product._id;
  });

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      const defaultSku = product.variants?.[0]?.sku || '';
      dispatch(
        setPendingAction({
          type: 'wishlist',
          payload: { productId: product._id, sku: defaultSku }
        })
      );
      dispatch(setAuthModalOpen(true));
      return;
    }

    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
      dispatch(addToast({ type: 'info', message: 'Removed from your Wishlist' }));
    } else {
      const defaultSku = product.variants?.[0]?.sku || '';
      dispatch(addToWishlist({ productId: product._id, sku: defaultSku }));
      dispatch(addToast({ type: 'success', message: 'Added to your Wishlist!' }));
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isAddingToCart) return;

    const defaultVariant = product.variants?.[0] || {};
    const targetSku = defaultVariant.sku || product.sku || '';

    setIsAddingToCart(true);
    try {
      await dispatch(
        addToCart({
          productId: product._id,
          sku: targetSku,
          quantity: 1
        })
      ).unwrap();
      setIsAdded(true);
      dispatch(addToast({ type: 'success', message: `Added "${product.title}" to your bag!` }));
      setTimeout(() => setIsAdded(false), 2000);
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to add item to bag';
      dispatch(addToast({ type: 'error', message: msg }));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImg =
    (typeof product.imageUrl === 'string' && product.imageUrl.trim() ? product.imageUrl.trim() : null) ||
    images.find((i) => i?.isPrimary && typeof i?.url === 'string')?.url ||
    images.find((i) => typeof i?.url === 'string')?.url ||
    (typeof images[0] === 'string' && images[0].trim() ? images[0].trim() : null) ||
    (images[0] && typeof images[0] === 'object' && typeof images[0]?.url === 'string' ? images[0].url : null) ||
    (typeof product.image === 'string' && product.image.trim() ? product.image.trim() : null) ||
    (typeof product.thumbnail === 'string' && product.thumbnail.trim() ? product.thumbnail.trim() : null) ||
    null;

  const secondaryImg =
    images.length > 1
      ? (typeof images[1] === 'string' ? images[1] : images[1]?.url)
      : null;

  // Safe stock calculation: only mark out-of-stock if explicitly indicated or variants exist with 0 stock
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const totalStock = hasVariants
    ? product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)
    : (product.stockQuantity !== undefined ? product.stockQuantity : 1);

  const isOutOfStock =
    product.isOutOfStock === true ||
    product.inStock === false ||
    (hasVariants && totalStock <= 0);

  const price = product.basePrice !== undefined ? product.basePrice : (product.price ? product.price * 100 : 0);
  const mrp = product.baseMrp !== undefined ? product.baseMrp : (product.mrp ? product.mrp * 100 : price);
  const discount = product.discountPercentage !== undefined
    ? product.discountPercentage
    : (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

  const rating = product.ratings?.average || 0;
  const ratingCount = product.ratings?.count || 0;

  return (
    <div
      className={`group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${className}`}
    >
      {/* Thumbnail Area */}
      <Link
        to={`/product/${product.slug}`}
        className="relative aspect-square w-full bg-gray-50 overflow-hidden block"
      >
        {primaryImg ? (
          <>
            <img
              src={primaryImg}
              alt={product.title}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                secondaryImg ? 'group-hover:opacity-0' : ''
              }`}
            />
            {secondaryImg && (
              <img
                src={secondaryImg}
                alt={`${product.title} preview`}
                loading="lazy"
                className="w-full h-full object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 text-gray-300 p-4">
            <Package className="w-12 h-12 stroke-[1.2] text-gray-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">MOSMAC</span>
          </div>
        )}

        {/* Out of Stock Overlay (placed behind badges so badges are sharp) */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
            <span className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Badges Overlay (Left) */}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-20 pointer-events-none">
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              {product.badges[0]}
            </span>
          </div>
        )}

        {/* Right Corner: Wishlist Button & Discount Badge */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs ${
              isInWishlist
                ? 'bg-rose-50 text-rose-600'
                : 'bg-white/80 text-gray-500 hover:text-rose-600 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>

          {discount >= 10 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm pointer-events-none">
              {discount}% OFF
            </span>
          )}
        </div>
      </Link>

      {/* Details Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          {/* Brand */}
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">
            {product.brandId?.name || 'Exclusive'}
          </p>

          {/* Title */}
          <Link
            to={`/product/${product.slug}`}
            className="text-sm font-semibold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2 block leading-snug"
            title={product.title}
          >
            {product.title}
          </Link>

          {/* Rating */}
          {rating > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                <span>{rating.toFixed(1)}</span>
                <Star className="w-2.5 h-2.5 fill-emerald-700 text-emerald-700" />
              </div>
              {ratingCount > 0 && (
                <span className="text-[11px] text-gray-400">({ratingCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
            <span className="text-sm sm:text-base font-bold text-gray-900">
              {formatCurrency(price)}
            </span>
            {mrp > price && (
              <span className="text-[11px] sm:text-xs text-gray-400 line-through">
                {formatCurrency(mrp)}
              </span>
            )}
          </div>

          {/* Add to Cart Button (Right Side) */}
          <button
            type="button"
            disabled={isOutOfStock || isAddingToCart}
            onClick={handleAddToCart}
            aria-label={isOutOfStock ? 'Sold Out' : isAdded ? 'Added to Bag' : `Add ${product.title} to Cart`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-2xs active:scale-[0.98] ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : isAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-950 hover:bg-black text-white hover:shadow-xs'
            }`}
          >
            {isOutOfStock ? (
              <span>Sold Out</span>
            ) : isAddingToCart ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Adding...</span>
              </>
            ) : isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;

