import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ProductCard } from '../components/product/ProductCard';
import {
  Home,
  ChevronRight,
  Sparkles,
  Tag,
  Star,
  ShieldCheck,
  ArrowRight,
  Layers,
  Flame,
  BadgePercent
} from 'lucide-react';
import { SeoHead } from '../components/common/SeoHead';

function getBeautySubcategoryFallback(name = '', slug = '') {
  const s = `${name} ${slug}`.toLowerCase();
  if (s.includes('eye')) return '/images/hero/hero-3-eyeshadow-palette.jpg';
  if (s.includes('lip')) return '/images/hero/hero-5-lip-balm.jpg';
  if (s.includes('tool') || s.includes('brush') || s.includes('sponge')) return '/images/hero/hero-2-loose-powder.jpg';
  if (s.includes('kit') || s.includes('set')) return '/images/editorial/get-the-look-model.jpg';
  return '/images/hero/hero-1-foundation.jpg';
}

export function CategoryPage() {
  const { categorySlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubcatFilter, setActiveSubcatFilter] = useState('all');

  useEffect(() => {
    async function fetchCategoryHub() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get(`/categories/${categorySlug}`);
        setData(res.data?.data || res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load category department');
      } finally {
        setLoading(false);
      }
    }
    if (categorySlug) {
      fetchCategoryHub();
    }
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Loading Department Hub...
        </p>
      </div>
    );
  }

  if (error || !data?.category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Category Not Found</h2>
        <p className="text-sm text-gray-500">{error || 'The requested category does not exist.'}</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold"
        >
          Browse All Products &rarr;
        </Link>
      </div>
    );
  }

  const category = data.category;
  const subcategories = data.subcategories || [];
  const deals = data.deals || [];
  const topRated = data.topRated || [];
  const bestsellers = data.bestsellers || [];
  const brands = data.brands || [];
  const totalProducts = data.totalProducts || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 bg-gray-50/40">
      <SeoHead
        title={`${category.name} Store | Subcategories & Top Deals on MOSMAC`}
        description={category.description || `Explore ${category.name} on MOSMAC with 100% genuine products, verified warranties and fast doorstep delivery.`}
        canonicalUrl={`/category/${category.slug}`}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 font-semibold">{category.name}</span>
      </nav>

      {/* Category Hero / Header Banner */}
      <div className="relative rounded-3xl bg-white border border-gray-200/80 p-6 sm:p-8 shadow-2xs overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Official Department Hub
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-950 tracking-tight">
            {category.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {category.description ||
              `Discover verified ${category.name.toLowerCase()} with direct manufacturer warranty and express delivery.`}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={`/products?category=${category.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition transform hover:-translate-y-0.5"
            >
              View All {totalProducts} Products in Catalogue &rarr;
            </Link>
            <span className="text-xs text-gray-400 font-medium">
              {subcategories.length} subcategories available
            </span>
          </div>
        </div>

        {category.imageUrl && (
          <div className="w-48 sm:w-60 h-36 sm:h-44 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-100 bg-gray-50 flex items-center justify-center">
            <img
              src={category.imageUrl}
              alt={category.name}
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
      </div>

      {/* Subcategory Filter Pills */}
      {subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubcatFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
              activeSubcatFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Subcategories ({subcategories.length})
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub._id}
              type="button"
              onClick={() => setActiveSubcatFilter(sub.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shrink-0 ${
                activeSubcatFilter === sub.slug
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Amazon-Style Multi-Card Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
          <h2 className="text-lg font-black text-gray-950 uppercase tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-600" />
            Explore by Subcategory & Featured Deals
          </h2>
          <span className="text-xs text-gray-500 font-medium">Curated Amazon Department View</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {/* Card 1: Explore deals in these categories (2x2 subcategories) */}
          {subcategories.length >= 4 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="group flex items-center justify-between font-bold text-gray-950 text-base mb-3 hover:text-rose-600 transition"
                >
                  <span className="line-clamp-1">Explore Deals in Subcategories</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="grid grid-cols-2 gap-2.5">
                  {subcategories.slice(0, 4).map((sub) => (
                    <Link
                      key={sub._id}
                      to={`/products?category=${sub.slug}`}
                      className="group flex flex-col items-center text-center p-2 rounded-xl bg-gray-50/70 hover:bg-rose-50/40 border border-gray-100 transition"
                    >
                      <div className="w-full aspect-square bg-white rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-gray-100 mb-1.5">
                        <img
                          src={
                            sub.imageUrl ||
                            sub.products?.[0]?.images?.[0]?.url ||
                            getBeautySubcategoryFallback(sub.name, sub.slug)
                          }
                          alt={sub.name}
                          className="w-full h-full object-cover rounded group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-800 line-clamp-1 group-hover:text-rose-600 transition">
                        {sub.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100">
                <Link
                  to={`/products?category=${category.slug}`}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
                >
                  Explore all subcategories <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )}

          {/* Subcategory 2x2 Product Cards (One card per subcategory) */}
          {subcategories
            .filter((sub) => activeSubcatFilter === 'all' || sub.slug === activeSubcatFilter)
            .map((sub) => {
              const prods = sub.products || [];
              if (prods.length === 0) return null;

              return (
                <div
                  key={sub._id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <Link
                      to={`/products?category=${sub.slug}`}
                      className="group flex items-center justify-between font-bold text-gray-950 text-base mb-3 hover:text-rose-600 transition"
                    >
                      <span className="line-clamp-1">{sub.name}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <div className="grid grid-cols-2 gap-2.5">
                      {prods.slice(0, 4).map((p) => {
                        const price = (p.basePrice || 0) / 100;
                        const mrp = (p.baseMrp || p.basePrice || 0) / 100;
                        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                        const img = p.images?.[0]?.url;

                        return (
                          <Link
                            key={p._id}
                            to={`/product/${p.slug}`}
                            className="group/item flex flex-col p-1.5 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 border border-gray-100/90 transition text-left"
                          >
                            <div className="w-full aspect-square bg-white rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-gray-100 mb-1.5 relative">
                              {img ? (
                                <img
                                  src={img}
                                  alt={p.title}
                                  className="w-full h-full object-contain group-hover/item:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="text-[10px] text-gray-400 font-mono">MOSMAC</div>
                              )}
                            </div>

                            {/* Amazon-style Red Discount & Deal Pill */}
                            {discount > 0 && (
                              <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                <span className="bg-red-600 text-white font-black text-[9px] px-1 py-0.5 rounded leading-none">
                                  {discount}% off
                                </span>
                                <span className="text-red-700 font-bold text-[9px] leading-none">
                                  Limited time deal
                                </span>
                              </div>
                            )}

                            <span className="text-[11px] font-medium text-gray-800 line-clamp-1 group-hover/item:text-rose-600">
                              {p.title}
                            </span>
                            <span className="text-[11px] font-bold text-gray-950 font-mono mt-0.5">
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-gray-100">
                    <Link
                      to={`/products?category=${sub.slug}`}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
                    >
                      See more in {sub.name} <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}

          {/* Deals You Might Like Card */}
          {deals.length >= 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <Link
                  to={`/products?category=${category.slug}&isFeatured=true`}
                  className="group flex items-center justify-between font-bold text-gray-950 text-base mb-3 hover:text-rose-600 transition"
                >
                  <span className="line-clamp-1 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-500" /> Deals You Might Like
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="grid grid-cols-2 gap-2.5">
                  {deals.slice(0, 4).map((p) => {
                    const price = (p.basePrice || 0) / 100;
                    const mrp = (p.baseMrp || p.basePrice || 0) / 100;
                    const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                    const img = p.images?.[0]?.url;

                    return (
                      <Link
                        key={p._id}
                        to={`/product/${p.slug}`}
                        className="group/item flex flex-col p-1.5 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 border border-gray-100/90 transition text-left"
                      >
                        <div className="w-full aspect-square bg-white rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-gray-100 mb-1.5">
                          {img && (
                            <img
                              src={img}
                              alt={p.title}
                              className="w-full h-full object-contain group-hover/item:scale-105 transition-transform"
                            />
                          )}
                        </div>
                        {discount > 0 && (
                          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                            <span className="bg-red-600 text-white font-black text-[9px] px-1 py-0.5 rounded leading-none">
                              {discount}% off
                            </span>
                            <span className="text-red-700 font-bold text-[9px] leading-none">
                              Deal
                            </span>
                          </div>
                        )}
                        <span className="text-[11px] font-medium text-gray-800 line-clamp-1 group-hover/item:text-rose-600">
                          {p.title}
                        </span>
                        <span className="text-[11px] font-bold text-gray-950 font-mono mt-0.5">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100">
                <Link
                  to={`/products?category=${category.slug}`}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
                >
                  Explore all deals <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )}

          {/* 4 Stars and Above Deals Card */}
          {topRated.length >= 2 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="group flex items-center justify-between font-bold text-gray-950 text-base mb-3 hover:text-rose-600 transition"
                >
                  <span className="line-clamp-1 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> 4★ & Above Picks
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="grid grid-cols-2 gap-2.5">
                  {topRated.slice(0, 4).map((p) => {
                    const price = (p.basePrice || 0) / 100;
                    const rating = p.ratings?.average || 4.5;
                    const img = p.images?.[0]?.url;

                    return (
                      <Link
                        key={p._id}
                        to={`/product/${p.slug}`}
                        className="group/item flex flex-col p-1.5 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 border border-gray-100/90 transition text-left"
                      >
                        <div className="w-full aspect-square bg-white rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-gray-100 mb-1.5">
                          {img && (
                            <img
                              src={img}
                              alt={p.title}
                              className="w-full h-full object-contain group-hover/item:scale-105 transition-transform"
                            />
                          )}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded w-max mb-0.5">
                          <span>★ {rating}</span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-800 line-clamp-1 group-hover/item:text-rose-600">
                          {p.title}
                        </span>
                        <span className="text-[11px] font-bold text-gray-950 font-mono mt-0.5">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100">
                <Link
                  to={`/products?category=${category.slug}`}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
                >
                  See 4+ star products <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )}

          {/* Top Brand Partners in this Category */}
          {brands.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <Link
                  to="/brands"
                  className="group flex items-center justify-between font-bold text-gray-950 text-base mb-3 hover:text-rose-600 transition"
                >
                  <span className="line-clamp-1 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600" /> Featured Brand Partners
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="grid grid-cols-2 gap-2.5">
                  {brands.slice(0, 4).map((b) => (
                    <Link
                      key={b._id}
                      to={`/products?brand=${b.slug}`}
                      className="group/b flex flex-col items-center justify-center p-2.5 rounded-xl bg-gray-50/70 hover:bg-emerald-50/40 border border-gray-100 transition text-center"
                    >
                      <div className="w-full h-12 flex items-center justify-center mb-1">
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="max-h-8 max-w-[80px] object-contain"
                          />
                        ) : (
                          <span className="font-black text-sm tracking-widest text-gray-800">
                            {b.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-700 group-hover/b:text-emerald-700 truncate max-w-full">
                        {b.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100">
                <Link
                  to="/brands"
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
                >
                  View all brand stores <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Subcategory Product Rails */}
      {subcategories.map((sub) => {
        if (!sub.products || sub.products.length === 0) return null;
        if (activeSubcatFilter !== 'all' && sub.slug !== activeSubcatFilter) return null;

        return (
          <section key={sub._id} className="space-y-4 pt-4 border-t border-gray-200/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-950 tracking-tight">
                  {sub.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sub.description || `Top picks in ${sub.name}`}
                </p>
              </div>
              <Link
                to={`/products?category=${sub.slug}`}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
              >
                View All {sub.productCount || sub.products.length} Products{' '}
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {sub.products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Authenticity & Warranty Guarantee */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            100% Verified Authentic & 1-Year Manufacturer Warranty
          </div>
          <h4 className="text-xl font-black tracking-tight">
            Directly Sourced From Verified Partner Brands
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            All {category.name} are backed by official brand warranties, easy 7-day doorstep returns, and nationwide express shipping.
          </p>
        </div>

        <Link
          to={`/products?category=${category.slug}`}
          className="shrink-0 px-6 py-3 bg-white text-gray-950 hover:bg-gray-100 rounded-2xl text-xs font-bold tracking-wider transition shadow-sm"
        >
          View Full Catalogue &rarr;
        </Link>
      </section>
    </div>
  );
}

export default CategoryPage;
