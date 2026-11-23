import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  Package,
  Heart,
  Share2,
  ChevronRight,
  Home,
  Check,
  AlertCircle,
  MapPin,
  Info,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { storefrontService } from '@/services/storefrontService';
import { addToCart } from '@/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import { setAuthModalOpen, setPendingAction, addToast } from '@/store/slices/uiSlice';
import ProductCard from '@/components/product/ProductCard';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Alert from '@/components/common/Alert';
import { formatCurrency } from '@/utils/formatters';
import { reviewService } from '@/services/reviewService';
import { SeoHead, buildProductSchema, buildBreadcrumbSchema } from '@/components/common/SeoHead';

const RECENTLY_VIEWED_KEY = 'aurora_recently_viewed';
const EMPTY_ITEMS = [];

export function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Variant & Image state
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Delivery PIN code checker state
  const [pincode, setPincode] = useState('');
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [pincodeResult, setPincodeResult] = useState(null);
  const [pincodeError, setPincodeError] = useState('');

  // Cart & Wishlist interaction feedback state
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccessNotice, setCartSuccessNotice] = useState(false);
  const [cartErrorNotice, setCartErrorNotice] = useState('');

  // Verified Customer Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    totalReviews: 0,
    averageRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  const wishlistItems = useSelector((state) => state.wishlist?.items) || EMPTY_ITEMS;
  const isInWishlist = product
    ? wishlistItems.some((item) => {
        const pId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
        return pId === product._id;
      })
    : false;

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;

    setIsAddingToCart(true);
    setCartErrorNotice('');
    try {
      await dispatch(
        addToCart({
          productId: product._id,
          sku: selectedVariant.sku,
          quantity
        })
      ).unwrap();
      setCartSuccessNotice(true);
      dispatch(addToast({ type: 'success', message: `Added '${product.title}' to your bag!` }));
      setTimeout(() => setCartSuccessNotice(false), 4000);
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || 'Failed to add item to bag');
      setCartErrorNotice(msg);
      dispatch(addToast({ type: 'error', message: msg }));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !selectedVariant) return;
    if (!isAuthenticated) {
      try {
        await dispatch(
          addToCart({
            productId: product._id,
            sku: selectedVariant.sku,
            quantity
          })
        ).unwrap();
      } catch (err) {
        console.warn('Could not preemptively add to bag for buy now:', err);
      }
      dispatch(
        setPendingAction({
          type: 'checkout',
          redirectTo: '/checkout'
        })
      );
      dispatch(setAuthModalOpen(true));
      return;
    }

    // Direct 1-Click checkout for this specific item without mixing with or altering cart
    navigate('/checkout', {
      state: {
        buyNowItem: {
          productId: product._id,
          sku: selectedVariant.sku,
          quantity,
          product,
          variant: selectedVariant
        }
      }
    });
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    if (!isAuthenticated) {
      dispatch(
        setPendingAction({
          type: 'wishlist',
          payload: {
            productId: product._id,
            sku: selectedVariant?.sku || ''
          }
        })
      );
      dispatch(setAuthModalOpen(true));
      return;
    }

    if (isInWishlist) {
      dispatch(removeFromWishlist(product._id));
      dispatch(addToast({ type: 'info', message: 'Removed from your Wishlist' }));
    } else {
      dispatch(
        addToWishlist({
          productId: product._id,
          sku: selectedVariant?.sku || ''
        })
      );
      dispatch(addToast({ type: 'success', message: 'Added to your Wishlist!' }));
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      setError('');
      try {
        const data = await storefrontService.getProductBySlug(slug);
        const prod = data.product;
        setProduct(prod);
        setRelatedProducts(data.relatedProducts || []);

        // Default to first active variant or variant with stock
        if (prod.variants && prod.variants.length > 0) {
          const inStockVariant = prod.variants.find((v) => v.isActive && v.stockQuantity > 0);
          setSelectedVariant(inStockVariant || prod.variants[0]);
        }

        // Find primary image index
        if (prod.images && prod.images.length > 0) {
          const primaryIdx = prod.images.findIndex((i) => i.isPrimary);
          setActiveImageIndex(primaryIdx >= 0 ? primaryIdx : 0);
        }

        // Add to recently viewed in localStorage
        try {
          const existing = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
          const filtered = existing.filter((p) => p._id !== prod._id);
          const updated = [
            {
              _id: prod._id,
              title: prod.title,
              slug: prod.slug,
              basePrice: prod.basePrice,
              baseMrp: prod.baseMrp,
              images: prod.images,
              brandId: prod.brandId,
              badges: prod.badges,
              ratings: prod.ratings,
              variants: prod.variants
            },
            ...filtered
          ].slice(0, 8);
          localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
        } catch (e) {
          // Ignore
        }
      } catch (err) {
        setError(err.message || 'Product not found or unavailable');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const loadProductReviews = async (productId) => {
    try {
      setIsReviewLoading(true);
      const res = await reviewService.getProductReviews(productId);
      setReviews(res.reviews || []);
      setReviewSummary(
        res.summary || {
          totalReviews: res.totalReviews || 0,
          averageRating: res.averageRating || 0,
          distribution: res.starDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      );
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const checkReviewEligibility = async (productId, sku) => {
    if (!isAuthenticated) return;
    try {
      const res = await reviewService.checkEligibility(productId, sku);
      setReviewEligibility(res);
    } catch (err) {
      setReviewEligibility({ eligible: false, isEligible: false });
    }
  };

  useEffect(() => {
    if (product?._id) {
      loadProductReviews(product._id);
    }
  }, [product?._id]);

  useEffect(() => {
    if (product?._id && selectedVariant?.sku) {
      checkReviewEligibility(product._id, selectedVariant.sku);
    }
  }, [product?._id, selectedVariant?.sku, isAuthenticated]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!product || !selectedVariant) return;
    try {
      setSubmittingReview(true);
      setReviewErrorMsg(null);
      await reviewService.submitReview(product._id, {
        sku: selectedVariant.sku,
        rating: Number(reviewForm.rating),
        title: reviewForm.title,
        comment: reviewForm.comment
      });
      setReviewSuccessMsg('Thank you! Your verified purchaser review has been submitted for moderation.');
      setReviewModalOpen(false);
      setReviewForm({ rating: 5, title: '', comment: '' });
      await checkReviewEligibility(product._id, selectedVariant.sku);
      setTimeout(() => setReviewSuccessMsg(null), 5000);
    } catch (err) {
      setReviewErrorMsg(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle PIN code check
  const handleCheckPincode = async (e) => {
    e.preventDefault();
    setPincodeError('');
    setPincodeResult(null);

    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setPincodeError('Please enter a valid 6-digit Indian PIN code (e.g. 110001, 560001)');
      return;
    }

    setIsCheckingPincode(true);
    try {
      const result = await storefrontService.checkPinCode(cleanPin);
      setPincodeResult(result);
    } catch (err) {
      setPincodeError(err.message || 'Unable to verify PIN code serviceability');
    } finally {
      setIsCheckingPincode(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-16 h-16 text-gray-300 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Product Not Available</h2>
        <p className="text-sm text-gray-500">
          The requested product could not be found, or has been temporarily unpublished.
        </p>
        <Link to="/products">
          <Button variant="primary">Return to Catalogue</Button>
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariant?.price ?? product.basePrice ?? 0;
  const currentMrp = selectedVariant?.mrp ?? product.baseMrp ?? currentPrice;
  const discount = currentMrp > currentPrice ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100) : 0;
  const availableStock = selectedVariant?.stockQuantity ?? 0;
  const lowStockThreshold = selectedVariant?.lowStockThreshold ?? 5;
  const isOutOfStock = availableStock <= 0;
  const isLowStock = !isOutOfStock && availableStock <= lowStockThreshold;

  const images = product.images && product.images.length > 0 ? product.images : [{ url: '', alt: product.title }];
  const activeImageUrl = images[activeImageIndex]?.url;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      <SeoHead
        title={product.title}
        description={product.description?.replace(/<[^>]+>/g, '').substring(0, 200)}
        canonicalUrl={`/product/${product.slug}`}
        ogImage={activeImageUrl}
        ogType="product"
        jsonLd={[
          buildProductSchema({ product, canonicalUrl: `/product/${product.slug}` }),
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Products', url: '/products' },
            ...(product.categoryId?.name ? [{ name: product.categoryId.name, url: `/category/${product.categoryId.slug}` }] : []),
            { name: product.title, url: `/product/${product.slug}` }
          ])
        ].filter(Boolean)}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-900 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" /> Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-gray-900">
          Products
        </Link>
        {product.categoryId && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/products?category=${product.categoryId.slug}`} className="hover:text-gray-900">
              {product.categoryId.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900 truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* Left Column: Image Gallery & Viewer */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full rounded-3xl bg-white border border-gray-100 overflow-hidden shadow-sm flex items-center justify-center">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-20 h-20 text-gray-300" />
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
              {product.badges?.map((badge, idx) => (
                <span
                  key={idx}
                  className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm"
                >
                  {badge}
                </span>
              ))}
              {discount >= 10 && (
                <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {discount}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 bg-gray-50 shrink-0 transition-all ${
                    activeImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.alt || `Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details, Variant Picker & Actions */}
        <div className="space-y-6">
          <div className="space-y-2 border-b border-gray-100 pb-5">
            {/* Brand */}
            {product.brandId && (
              <Link
                to={`/products?brand=${product.brandId.slug}`}
                className="text-xs font-bold text-emerald-600 uppercase tracking-wider hover:underline"
              >
                {product.brandId.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
              {product.title}
            </h1>

            {/* Ratings & SKU */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {product.ratings?.average > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    <span>{product.ratings.average.toFixed(1)}</span>
                    <Star className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                  </div>
                  <span>{product.ratings.count} verified ratings</span>
                </div>
              )}

              {selectedVariant?.sku && (
                <div className="font-mono text-gray-400">
                  SKU: <strong className="text-gray-700">{selectedVariant.sku}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Price Block */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-gray-900">
                {formatCurrency(currentPrice)}
              </span>
              {currentMrp > currentPrice && (
                <span className="text-base text-gray-400 line-through font-medium">
                  {formatCurrency(currentMrp)}
                </span>
              )}
              {discount > 0 && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  Save {discount}% ({formatCurrency(currentMrp - currentPrice)})
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">Inclusive of all applicable GST & taxes</p>
          </div>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 1 && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-gray-700">
                  Select Option: <span className="text-gray-900 font-extrabold">{selectedVariant?.title}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.sku === v.sku;
                  const isVariantOos = v.stockQuantity <= 0;

                  return (
                    <button
                      key={v.sku}
                      type="button"
                      disabled={isVariantOos}
                      onClick={() => {
                        setSelectedVariant(v);
                        setQuantity(1);
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all relative ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                          : isVariantOos
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span>{v.title}</span>
                      {isVariantOos && (
                        <span className="block text-[9px] font-normal text-red-500 no-underline">
                          Sold Out
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Availability Indicator */}
          <div className="space-y-2">
            {isOutOfStock ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                <AlertCircle className="w-4 h-4" /> Out of Stock
              </div>
            ) : isLowStock ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-600" /> Only {availableStock} left in stock - order soon
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <Check className="w-4 h-4 text-emerald-600" /> In Stock & Ready to Dispatch
              </div>
            )}
          </div>

          {/* Quantity Selector & CTAs */}
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-gray-700 uppercase">Quantity:</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-xs font-bold text-gray-900 select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= Math.min(availableStock, 10) || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.min(availableStock, 10, q + 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {cartErrorNotice && (
              <Alert type="error" message={cartErrorNotice} />
            )}

            {cartSuccessNotice && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{quantity}x</strong> added to your bag!
                  </span>
                </div>
                <Link
                  to="/cart"
                  className="font-bold inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 underline"
                >
                  View Bag &rarr;
                </Link>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={isOutOfStock || isAddingToCart}
                onClick={handleAddToCart}
                className="flex-1 shadow-lg shadow-emerald-900/10"
              >
                {isAddingToCart ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" /> Adding...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Add to Bag
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={isOutOfStock || isAddingToCart}
                onClick={handleBuyNow}
                className="flex-1"
              >
                Buy Now
              </Button>

              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`p-3.5 rounded-xl border transition-colors flex items-center justify-center ${
                  isInWishlist
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-gray-300'
                }`}
                title={isInWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'}
                aria-label="Toggle Wishlist"
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-rose-600 text-rose-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Delivery PIN Code Serviceability Widget */}
          <div className="bg-gray-50/75 rounded-2xl border border-gray-200/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Check Delivery & COD Availability
            </div>

            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit Indian PIN Code"
                className="flex-1 rounded-xl border border-gray-300 py-1.5 px-3 text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Button type="submit" variant="secondary" size="sm" disabled={isCheckingPincode}>
                {isCheckingPincode ? 'Checking...' : 'Check'}
              </Button>
            </form>

            {pincodeError && (
              <p className="text-xs text-red-600 font-medium">{pincodeError}</p>
            )}

            {pincodeResult && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl space-y-1">
                <p className="font-semibold">{pincodeResult.message}</p>
                <div className="flex gap-3 text-[11px] text-emerald-700 pt-0.5">
                  <span>Hub: {pincodeResult.region}</span>
                  <span>•</span>
                  <span>Cash on Delivery: Eligible</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Specifications & Description Tabs */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-8">
        {/* Specifications Table */}
        {product.attributes && product.attributes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Product Specifications & Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              {product.attributes.map((attr, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-semibold text-gray-500 capitalize">
                    {attr.code.replace(/_/g, ' ')}
                  </span>
                  <span className="font-bold text-gray-900 text-right">
                    {Array.isArray(attr.value) ? attr.value.join(', ') : String(attr.value)}
                    {attr.unit ? ` ${attr.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Full Description */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">
            About this Item
          </h3>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      </div>

      {/* Verified Customer Reviews Section */}
      <section className="space-y-6 pt-8 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              Verified Customer Ratings & Reviews
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Real feedback exclusively from verified customers with delivered orders.
            </p>
          </div>

          <div>
            {isAuthenticated ? (
              reviewEligibility?.eligible || reviewEligibility?.isEligible ? (
                <button
                  onClick={() => setReviewModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm"
                >
                  <Star className="w-4 h-4 mr-1.5 fill-white" />
                  Write a Verified Review
                </button>
              ) : reviewEligibility?.reason === 'ALREADY_REVIEWED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                  <Check className="w-4 h-4 text-emerald-600" />
                  You reviewed this product
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Delivered purchase required to review
                </span>
              )
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition shadow-xs"
              >
                Sign in to review
              </Link>
            )}
          </div>
        </div>

        {/* Success / Error notices */}
        {reviewSuccessMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            {reviewSuccessMsg}
          </div>
        )}

        {/* Rating Breakdown Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-4 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
            <div className="text-5xl font-black text-gray-900 tracking-tight">
              {reviewSummary.averageRating || product.ratings?.average || 0}
              <span className="text-xl font-normal text-gray-400">/5</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(reviewSummary.averageRating || product.ratings?.average || 0)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Based on {reviewSummary.totalReviews || product.ratings?.count || 0} verified customer ratings
            </p>
          </div>

          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviewSummary.distribution?.[star] || 0;
              const total = reviewSummary.totalReviews || 1;
              const pct = reviewSummary.totalReviews > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-10 font-medium text-gray-600">{star} star</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-gray-400">{pct}% ({count})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        {isReviewLoading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Star className="w-8 h-8 text-gray-300 mx-auto" />
            <h4 className="text-sm font-semibold text-gray-700">No Verified Reviews Yet</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Be the first verified customer with a delivered order to share your thoughts on this product.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div
                key={rev._id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-gray-900">{rev.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {rev.comment}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                  <span className="font-semibold text-gray-800">{rev.customerName}</span>
                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Purchaser
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Write a Verified Review</h3>
                <p className="text-xs text-gray-500">{product.title}</p>
              </div>
              <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {reviewErrorMsg && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
                {reviewErrorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1 focus:outline-none hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewForm.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-gray-700 ml-2">
                    {reviewForm.rating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline / Summary *</label>
                <input
                  type="text"
                  required
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="e.g. Excellent build quality, battery exceeded expectations!"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Detailed Experience *</label>
                <textarea
                  rows={4}
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="What did you like or dislike? How does it fit into your daily routine?"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Customers Also Viewed
            </h2>
            {product.categoryId && (
              <Link
                to={`/products?category=${product.categoryId.slug}`}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                See all in {product.categoryId.name} &rarr;
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetailPage;

