import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Package,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  fetchWishlist,
  removeFromWishlist,
  moveWishlistItemToCart
} from '@/store/slices/wishlistSlice';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Alert from '@/components/common/Alert';
import { formatCurrency } from '@/utils/formatters';

export function WishlistPage() {
  const dispatch = useDispatch();
  const { items, itemCount, isLoading, isMutating, error, lastActionSuccess } = useSelector(
    (state) => state.wishlist
  );

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleRemove = (productId) => {
    dispatch(removeFromWishlist(productId));
  };

  const handleMoveToBag = (item) => {
    const productId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
    const sku = item.sku || (typeof item.productId === 'object' ? item.productId?.variants?.[0]?.sku : '');
    dispatch(moveWishlistItemToCart({ productId, sku, quantity: 1 }));
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-gray-500 font-medium">Loading your saved items...</p>
      </div>
    );
  }

  // Empty Wishlist State
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center space-y-6 bg-white p-8 sm:p-12 rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Heart className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Wishlist is empty</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              Found something you love? Tap the heart icon on any product to save it here for later.
            </p>
          </div>

          <div className="pt-2">
            <Link to="/products">
              <Button variant="primary" size="lg" className="w-full">
                Explore Catalogue
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            My Wishlist
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {itemCount} {itemCount === 1 ? 'saved item' : 'saved items'}
          </p>
        </div>

        <Link to="/cart">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Go to Shopping Bag</span>
          </Button>
        </Link>
      </div>

      {error && <Alert type="error" message={error} />}

      {lastActionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lastActionSuccess}</span>
        </div>
      )}

      {/* Grid of Wishlist Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const product = typeof item.productId === 'object' ? item.productId : null;
          if (!product) return null;

          const productId = product._id;
          const images = Array.isArray(product.images) ? product.images : [];
          const primaryImg =
            (typeof product.imageUrl === 'string' && product.imageUrl.trim() ? product.imageUrl.trim() : null) ||
            images.find((i) => i?.isPrimary && typeof i?.url === 'string')?.url ||
            images.find((i) => typeof i?.url === 'string')?.url ||
            (typeof images[0] === 'string' && images[0].trim() ? images[0].trim() : null) ||
            (images[0] && typeof images[0] === 'object' && typeof images[0]?.url === 'string' ? images[0].url : null) ||
            null;

          const totalStock = product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) ?? 0;
          const isOutOfStock = totalStock <= 0;

          const price = product.basePrice || 0;
          const mrp = product.baseMrp || price;
          const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

          return (
            <div
              key={productId}
              className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail */}
                <div className="relative aspect-square w-full bg-gray-50 overflow-hidden">
                  <Link to={`/product/${product.slug}`} className="block w-full h-full">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-12 h-12 stroke-[1.5]" />
                      </div>
                    )}
                  </Link>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(productId)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors shadow-xs"
                    title="Remove from Wishlist"
                    aria-label="Remove from Wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Discount Badge */}
                  {discount >= 10 && (
                    <div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm pointer-events-none">
                      {discount}% OFF
                    </div>
                  )}

                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                    {product.brandId?.name || 'Exclusive'}
                  </p>

                  <Link
                    to={`/product/${product.slug}`}
                    className="text-sm font-bold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2 leading-snug"
                    title={product.title}
                  >
                    {product.title}
                  </Link>

                  {/* Pricing */}
                  <div className="pt-1 flex items-baseline gap-2">
                    <span className="text-base font-extrabold text-gray-900">
                      {formatCurrency(price)}
                    </span>
                    {mrp > price && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(mrp)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Move to Bag Action CTA */}
              <div className="p-4 pt-0">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isOutOfStock || isMutating}
                  onClick={() => handleMoveToBag(item)}
                  className="w-full flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isOutOfStock ? 'Out of Stock' : 'Move to Bag'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WishlistPage;
