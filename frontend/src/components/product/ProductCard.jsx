import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Star, Package, Eye, Heart } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';

const EMPTY_ITEMS = [];

export function ProductCard({ product, className = '' }) {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state) => state.wishlist?.items) || EMPTY_ITEMS;

  if (!product) return null;

  const isInWishlist = wishlistItems.some((item) => {
    const pId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
    return pId === product._id;
  });

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
    } else {
      const defaultSku = product.variants?.[0]?.sku || '';
      dispatch(addToWishlist({ productId: product._id, sku: defaultSku }));
    }
  };

  const images = product.images || [];
  const primaryImg = images.find((i) => i.isPrimary)?.url || images[0]?.url;
  const secondaryImg = images.length > 1 ? images[1]?.url : null;

  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) ?? 0;
  const isOutOfStock = totalStock <= 0;

  const price = product.basePrice || 0;
  const mrp = product.baseMrp || price;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

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
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Package className="w-12 h-12 stroke-[1.5]" />
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {product.badges && product.badges.length > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              {product.badges[0]}
            </span>
          )}
          {discount >= 10 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Wishlist Button Overlay */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs ${
            isInWishlist
              ? 'bg-rose-50 text-rose-600'
              : 'bg-white/80 text-gray-500 hover:text-rose-600 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
        </button>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Details Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
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

        {/* Pricing */}
        <div className="pt-2 border-t border-gray-50 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(price)}
            </span>
            {mrp > price && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(mrp)}
              </span>
            )}
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
          >
            View <Eye className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;

