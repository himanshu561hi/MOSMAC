import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Sparkles,
  Layers,
  Star,
  ChevronRight,
  TrendingUp,
  Package
} from 'lucide-react';
import { storefrontService } from '@/services/storefrontService';
import { cmsService } from '@/services/cmsService';
import ProductCard from '@/components/product/ProductCard';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { SeoHead, buildOrganizationSchema, buildWebSiteSchema } from '@/components/common/SeoHead';

const RECENTLY_VIEWED_KEY = 'aurora_recently_viewed';

export function HomePage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeTab, setActiveTab] = useState('featured'); // 'featured' | 'newArrivals' | 'bestSellers'

  useEffect(() => {
    async function loadHome() {
      setIsLoading(true);
      setError('');
      try {
        const [homeData, cmsLayout, cmsBanners] = await Promise.all([
          storefrontService.getHomepageData().catch(() => null),
          cmsService.getHomepageLayout().catch(() => []),
          cmsService.getPublicBanners('hero').catch(() => [])
        ]);

        const mergedData = { ...(homeData || {}) };
        if (cmsBanners && cmsBanners.length > 0) {
          mergedData.heroBanners = cmsBanners.map((b) => ({
            title: b.title,
            subtitle: b.subtitle,
            ctaText: b.ctaLabel || 'Shop Now',
            ctaLink: b.ctaDestination || '/products',
            imageUrl: b.desktopImageUrl,
            badge: 'FEATURED CAMPAIGN'
          }));
        }
        mergedData.cmsSections = cmsLayout || [];
        setData(mergedData);
      } catch (err) {
        console.error('Failed to load homepage:', err);
        setError(err.message || 'Failed to load catalogue');
      } finally {
        setIsLoading(false);
      }
    }
    loadHome();

    // Load recently viewed products
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) {
        setRecentlyViewed(JSON.parse(stored).slice(0, 4));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const heroBanner = data?.heroBanners?.[0] || {
    title: 'Curated Quality Products for Modern Living',
    subtitle: 'Discover handpicked products across categories with pan-India delivery, cash on delivery, and 7-day returns.',
    ctaText: 'Explore Collection',
    ctaLink: '/products',
    badge: 'NEW SEASON ESSENTIALS',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80'
  };

  const currentProductList =
    activeTab === 'featured'
      ? data?.featuredProducts || []
      : activeTab === 'newArrivals'
      ? data?.newArrivals || []
      : data?.bestSellers || [];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SeoHead
        title="Aura | Curated Quality Products for Modern Living"
        description="Discover handpicked lifestyle and electronics products with pan-India delivery, cash on delivery, and 7-day returns."
        canonicalUrl="/"
        jsonLd={[buildWebSiteSchema(), buildOrganizationSchema()]}
      />

      {/* 1. Dynamic Hero Banner Section */}
      <section className="relative bg-slate-950 text-white overflow-hidden rounded-b-3xl">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src={heroBanner.imageUrl}
            alt={heroBanner.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
          <div className="max-w-2xl space-y-6">
            {heroBanner.badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                {heroBanner.badge}
              </span>
            )}

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
              {heroBanner.title}
            </h1>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl">
              {heroBanner.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to={heroBanner.ctaLink || '/products'}>
                <Button size="lg" className="shadow-lg shadow-emerald-900/40">
                  {heroBanner.ctaText || 'Shop Now'} <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/products?inStock=true">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 text-white hover:bg-white hover:text-gray-900 border-white/20 backdrop-blur-xs"
                >
                  View In-Stock Items
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Promotional Value Propositions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Pan-India Delivery</h4>
              <p className="text-xs text-gray-500 mt-0.5">Free delivery on orders over ₹999</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">100% Genuine Products</h4>
              <p className="text-xs text-gray-500 mt-0.5">Direct sourcing & verified warranty</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">7-Day Easy Returns</h4>
              <p className="text-xs text-gray-500 mt-0.5">Hassle-free doorstep collection</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Dedicated Support</h4>
              <p className="text-xs text-gray-500 mt-0.5">Quick resolutions on WhatsApp & email</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Category Discovery Grid */}
      {data?.featuredCategories && data.featuredCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Featured Categories
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Explore handpicked departments and curated product collections.
              </p>
            </div>
            <Link
              to="/products"
              className="text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group"
            >
              Browse All <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {data.featuredCategories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products?category=${cat.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center overflow-hidden border border-emerald-100 group-hover:scale-105 transition-transform">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Products Showcase with Interactive Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Popular Products
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Top-rated and trending items ready for immediate dispatch.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('featured')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'featured'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Featured
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('newArrivals')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'newArrivals'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              New Arrivals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bestSellers')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'bestSellers'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Best Sellers
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-gray-400">Loading products...</p>
          </div>
        ) : currentProductList.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 p-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No products available</h3>
            <p className="text-xs text-gray-500 mt-1">Check back soon as new inventory is published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {currentProductList.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        <div className="text-center pt-4">
          <Link to="/products">
            <Button variant="secondary" size="md">
              View All Products in Catalogue &rarr;
            </Button>
          </Link>
        </div>
      </section>

      {/* 5. Brand Showcase */}
      {data?.brands && data.brands.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-gray-900">Featured Brands</h2>
            <p className="text-xs text-gray-500">Official brand partners verified for authenticity</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2">
            {data.brands.map((brand) => (
              <Link
                key={brand._id}
                to={`/products?brand=${brand.slug}`}
                className="px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-emerald-500 transition-colors flex items-center justify-center min-w-[120px] text-xs font-bold text-gray-700 hover:text-emerald-700"
              >
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="h-6 object-contain" />
                ) : (
                  <span>{brand.name}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. Recently Viewed Products (if any) */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Recently Viewed by You
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {recentlyViewed.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
