import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingBag,
  Trash2,
  Heart,
  Tag,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Package,
  X
} from 'lucide-react';
import {
  fetchCart,
  updateCartQuantity,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  clearWarnings
} from '@/store/slices/cartSlice';
import { addToWishlist } from '@/store/slices/wishlistSlice';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Alert from '@/components/common/Alert';
import { SeoHead } from '@/components/common/SeoHead';
import { formatCurrency } from '@/utils/formatters';

export function CartPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    items,
    itemCount,
    distinctItemCount,
    subtotal,
    discountAmount,
    shippingFee,
    grandTotal,
    freeShippingThreshold,
    freeShippingEligible,
    amountNeededForFreeShipping,
    appliedCoupon,
    warnings,
    isLoading,
    isMutating,
    error
  } = useSelector((state) => state.cart);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleUpdateQuantity = (sku, newQty) => {
    if (newQty < 1 || newQty > 10) return;
    dispatch(updateCartQuantity({ sku, quantity: newQty }));
  };

  const handleRemoveItem = (sku) => {
    dispatch(removeCartItem(sku));
  };

  const handleMoveToWishlist = (item) => {
    const prodId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
    dispatch(addToWishlist({ productId: prodId, sku: item.sku }));
    dispatch(removeCartItem(item.sku));
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError('');
    try {
      await dispatch(applyCoupon(couponInput.trim().toUpperCase())).unwrap();
      setCouponInput('');
    } catch (err) {
      setCouponError(err || 'Failed to apply coupon');
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError('');
    dispatch(removeCoupon());
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to remove all items from your bag?')) {
      dispatch(clearCart());
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-gray-500 font-medium">Loading your shopping bag...</p>
      </div>
    );
  }

  // Empty Cart State
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center space-y-6 bg-white p-8 sm:p-12 rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Shopping Bag is empty</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              Explore our curated catalogue of premium electronics, fashion, home decor, and essentials.
            </p>
          </div>

          <div className="pt-2">
            <Link to="/products">
              <Button variant="primary" size="lg" className="w-full">
                Explore Products
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Progress towards Free Shipping
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <SeoHead
        title="Shopping Bag | Aura"
        description="View your active shopping bag items and proceed to secure checkout."
        canonicalUrl="/cart"
        robots="noindex, nofollow"
      />

      {/* Page Title & Item Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Shopping Bag
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearCart}
          className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Bag
        </button>
      </div>

      {/* Backend Live Price & Stock Warnings Banner */}
      {warnings && warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cart Updates & Live Catalog Alerts</span>
            </div>
            <button
              type="button"
              onClick={() => dispatch(clearWarnings())}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-1 text-xs text-amber-800 list-disc list-inside">
            {warnings.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <Alert type="error" message={error} />}

      {/* Main Grid: Left Items List, Right Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200/70 shadow-2xs divide-y divide-gray-100 overflow-hidden">
            {items.map((item) => {
              const product = typeof item.productId === 'object' ? item.productId : null;
              const productTitle = product?.title || 'Product Unavailable';
              const productSlug = product?.slug || '';
              const brandName = product?.brandId?.name || '';
              const primaryImage = product?.images?.find((img) => img.isPrimary)?.url || product?.images?.[0]?.url;

              const isItemOutOfStock = item.isOutOfStock || false;
              const itemPrice = item.effectivePrice || item.addedPrice || 0;
              const lineTotal = itemPrice * item.quantity;

              return (
                <div
                  key={item._id || item.sku}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start justify-between transition-colors hover:bg-gray-50/40"
                >
                  {/* Thumbnail & Product Details */}
                  <div className="flex gap-4 sm:gap-5 flex-1 min-w-0">
                    <Link
                      to={productSlug ? `/product/${productSlug}` : '#'}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center"
                    >
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={productTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                    </Link>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {brandName && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {brandName}
                        </p>
                      )}

                      <Link
                        to={productSlug ? `/product/${productSlug}` : '#'}
                        className="text-sm sm:text-base font-bold text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2 leading-snug"
                      >
                        {productTitle}
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {item.variantTitle && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-700">
                            {item.variantTitle}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-gray-400">
                          SKU: {item.sku}
                        </span>
                      </div>

                      {isItemOutOfStock && (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Currently Out of Stock
                        </div>
                      )}

                      {/* Unit Price */}
                      <div className="pt-1 flex items-baseline gap-2">
                        <span className="text-sm font-extrabold text-gray-900">
                          {formatCurrency(itemPrice)}
                        </span>
                        <span className="text-xs text-gray-400">/ unit</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-black text-gray-900">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        disabled={item.quantity <= 1 || isMutating}
                        onClick={() => handleUpdateQuantity(item.sku, item.quantity - 1)}
                        className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-xs font-bold text-gray-900 select-none min-w-7 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= 10 || isMutating}
                        onClick={() => handleUpdateQuantity(item.sku, item.quantity + 1)}
                        className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* Actions: Save to Wishlist & Remove */}
                    <div className="flex items-center gap-3 text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => handleMoveToWishlist(item)}
                        className="text-gray-500 hover:text-emerald-700 font-medium transition-colors flex items-center gap-1"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.sku)}
                        className="text-gray-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery & Security Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 text-xs text-gray-600 shadow-2xs">
              <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Pan-India Express Dispatch in 24-48 hrs</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 text-xs text-gray-600 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>100% Genuine Certified Products</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 text-xs text-gray-600 shadow-2xs">
              <RotateCcw className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Hassle-Free 7-Day Replacement</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="lg:col-span-4 space-y-6">
          {/* Free Shipping Progress Card */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                Express Shipping
              </span>
              <span>
                {freeShippingEligible ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> FREE
                  </span>
                ) : (
                  formatCurrency(shippingFee)
                )}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-gray-500 leading-snug">
              {freeShippingEligible ? (
                <span className="text-emerald-700 font-semibold">
                  Congratulations! You unlocked FREE shipping on this order.
                </span>
              ) : (
                <>
                  Add <strong>{formatCurrency(amountNeededForFreeShipping)}</strong> more to qualify for{' '}
                  <strong className="text-emerald-700">FREE delivery</strong>!
                </>
              )}
            </p>
          </div>

          {/* Coupon / Promo Code Card */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-5 shadow-2xs space-y-3">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" /> Apply Promo Code
            </label>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-900 tracking-wider font-mono">
                      {appliedCoupon.code}
                    </span>
                    <span className="bg-emerald-200/60 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      Applied
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Saved {formatCurrency(appliedCoupon.discountAmount)} on your order
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-full"
                  title="Remove coupon"
                  aria-label="Remove coupon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="e.g. AURORA10"
                    className="flex-1 rounded-xl border border-gray-300 py-2 px-3 text-xs uppercase tracking-wider font-mono bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={!couponInput.trim() || isMutating}
                  >
                    Apply
                  </Button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-600 font-medium">{couponError}</p>
                )}
              </form>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs text-gray-600 border-b border-gray-100 pb-4">
              <div className="flex justify-between">
                <span>Bag Subtotal ({itemCount} items)</span>
                <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span>
                  {freeShippingEligible ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatCurrency(shippingFee)
                  )}
                </span>
              </div>
            </div>

            {/* Total Payable Amount */}
            <div className="flex justify-between items-baseline pt-1">
              <div>
                <p className="text-xs font-bold text-gray-900">Total Payable</p>
                <p className="text-[10px] text-gray-400">Inclusive of all taxes</p>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(grandTotal)}
              </p>
            </div>

            {/* Checkout CTA */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
