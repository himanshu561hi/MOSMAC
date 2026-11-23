import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../services/cmsService';
import { ProductCard } from '../components/product/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Sparkles,
  ChevronRight,
  Home,
  ArrowRight,
  Tag,
  Star,
  Flame,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { SeoHead } from '../components/common/SeoHead';

export function WhatsNewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  useEffect(() => {
    async function loadWhatsNew() {
      try {
        setLoading(true);
        setError(null);
        const res = await cmsService.getWhatsNewData();
        setData(res?.data || res);
      } catch (err) {
        setError(err.message || 'Failed to load What’s New collections');
      } finally {
        setLoading(false);
      }
    }
    loadWhatsNew();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Curating What’s New on MOSMAC...
        </p>
      </div>
    );
  }

  const config = data?.config || {};
  const heroBanner = data?.heroBanner || config.heroBanner;
  const newBrands = data?.newBrands || [];
  const justDroppedAll = data?.justDropped || [];
  const onlyOnMosmac = data?.onlyOnMosmac || [];
  const trendingNow = data?.trendingNow || [];
  const categories = data?.categories || [];

  // Filter Just Dropped by active category pill
  const filteredJustDropped =
    activeCategoryFilter === 'all'
      ? justDroppedAll
      : justDroppedAll.filter((p) => {
          const catSlug = p.categoryId?.slug;
          return catSlug === activeCategoryFilter;
        });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      <SeoHead
        title="What's New & Trending | Fresh Beauty Launches & Curated Cosmetics on MOSMAC"
        description="Discover the newest cosmetics drops, luxury makeup brand releases, viral lip shades, and trending beauty on MOSMAC."
        canonicalUrl="/whats-new"
      />

      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-semibold">What's New</span>
      </nav>

      {/* 1. Hero Promo Banner */}
      {config.heroBanner?.enabled !== false && heroBanner && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-orange-500/10 border border-amber-200/60 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center min-h-[300px] sm:min-h-[360px]">
            <div className="p-8 sm:p-12 space-y-4 z-10">
              {heroBanner.badge && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  {heroBanner.badge}
                </div>
              )}
              <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight">
                {heroBanner.title || 'THE MODERN BEAUTY SCENE'}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium max-w-md leading-relaxed">
                {heroBanner.subtitle || 'Discover fresh arrivals in luxury cosmetics, radiant complexion & viral beauty drops'}
              </p>
              <div className="pt-2">
                <Link
                  to={heroBanner.ctaLink || '/products?sortBy=newest'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-950 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-transform hover:-translate-y-0.5"
                >
                  {heroBanner.ctaText || 'Shop New Arrivals'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative h-64 sm:h-full min-h-[280px] overflow-hidden flex items-center justify-center p-6">
              <img
                src={
                  heroBanner.imageUrl ||
                  '/images/editorial/get-the-look-model.jpg'
                }
                alt={heroBanner.title || "What's New Banner"}
                className="w-full h-full object-cover rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* 2. New Brands On MOSMAC Spotlight */}
      {config.newBrands?.enabled !== false && newBrands.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-500" />
                {config.newBrands?.title || 'New Brands On MOSMAC'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.newBrands?.subtitle || 'Recently onboarded premium brands & authorized flagships'}
              </p>
            </div>
            <Link
              to="/brands"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
            >
              View All <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {newBrands.slice(0, 3).map((brand, idx) => {
              const lifestyleImages = [
                '/images/hero/hero-1-foundation.jpg',
                '/images/hero/hero-3-eyeshadow-palette.jpg',
                '/images/hero/hero-5-lip-balm.jpg'
              ];
              const lifestyleImg = lifestyleImages[idx % lifestyleImages.length];

              return (
                <Link
                  key={brand._id}
                  to={`/products?brand=${brand.slug}`}
                  className="group relative h-64 rounded-2xl overflow-hidden border border-gray-100 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-end p-5"
                >
                  <img
                    src={lifestyleImg}
                    alt={brand.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/30 to-transparent" />

                  <div className="relative z-10 space-y-1 text-white">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30">
                      Brand Spotlight
                    </span>
                    <h3 className="text-lg font-black tracking-tight">{brand.name}</h3>
                    <p className="text-xs text-gray-200 line-clamp-1">{brand.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Just Dropped (New Arrivals) */}
      {config.justDropped?.enabled !== false && justDroppedAll.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                {config.justDropped?.title || 'Just Dropped'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.justDropped?.subtitle || 'Fresh arrivals across top categories'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/products?sortBy=newest"
                className="text-xs font-bold text-gray-900 hover:text-indigo-600 flex items-center gap-1 group"
              >
                View All <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Category Filter Pills (like in screenshot: Skin, Makeup, Fragrance...) */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
                  activeCategoryFilter === 'all'
                    ? 'bg-gray-950 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
                    activeCategoryFilter === cat.slug
                      ? 'bg-gray-950 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredJustDropped.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Only On MOSMAC (Exclusives) */}
      {config.onlyOnMosmac?.enabled !== false && onlyOnMosmac.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider mb-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                Exclusive Edition
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {config.onlyOnMosmac?.title || 'Only On MOSMAC'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.onlyOnMosmac?.subtitle || 'Curated products & limited editions available exclusively with us'}
              </p>
            </div>

            <Link
              to="/products?isFeatured=true"
              className="text-xs font-bold text-gray-900 hover:text-amber-600 flex items-center gap-1 group"
            >
              View All <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {onlyOnMosmac.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Trending Now */}
      {config.trendingNow?.enabled !== false && trendingNow.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                {config.trendingNow?.title || 'Trending Now'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.trendingNow?.subtitle || 'Community favorites & high-demand items this week'}
              </p>
            </div>

            <Link
              to="/products?section=trending"
              className="text-xs font-bold text-gray-900 hover:text-red-600 flex items-center gap-1 group"
            >
              View All <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {trendingNow.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Quality & Trust Banner */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            100% Verified Authentic
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Direct Brand Sourcing & Authorized Warranties
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Every product launched on MOSMAC is shipped with genuine manufacturer seals, official GST tax invoices, and comprehensive doorstep support.
          </p>
        </div>

        <Link
          to="/products"
          className="shrink-0 px-6 py-3 bg-white text-gray-950 hover:bg-gray-100 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm"
        >
          Explore Entire Store &rarr;
        </Link>
      </section>
    </div>
  );
}

export default WhatsNewPage;
