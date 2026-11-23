import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Sparkles,
  ShieldCheck,
  Award,
  Crown,
  ChevronRight,
  ShoppingBag,
  Star,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  Home
} from 'lucide-react';
import { homepageSectionService } from '@/services/homepageSectionService';
import { addToCart } from '@/store/slices/cartSlice';
import { addToast } from '@/store/slices/uiSlice';
import ProductCard from '@/components/product/ProductCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TrustPillarsBanner from '@/components/common/TrustPillarsBanner';
import { SeoHead } from '@/components/common/SeoHead';

export function MosmacSelectPage() {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('curator'); // 'curator', 'price_asc', 'price_desc', 'rating'
  const [spotlightAdded, setSpotlightAdded] = useState(false);

  useEffect(() => {
    async function loadSelectProducts() {
      try {
        setLoading(true);
        setError(null);
        // Load storefront sections to get products assigned to mosmac_select
        const sections = await homepageSectionService.getStorefrontSections();
        const selectSec = sections.find((s) => s.slug === 'mosmac_select');
        if (selectSec && Array.isArray(selectSec.products) && selectSec.products.length > 0) {
          setProducts(selectSec.products);
        } else {
          // Fallback to direct products endpoint
          const res = await fetch('/api/v1/products?section=mosmac_select').then((r) => r.json());
          if (res?.data?.products) {
            setProducts(res.data.products);
          }
        }
      } catch (err) {
        console.error('Failed to load MOSMAC Select products:', err);
        setError('Failed to load MOSMAC Select vault collection.');
      } finally {
        setLoading(false);
      }
    }
    loadSelectProducts();
  }, []);

  // Filter categories from products
  const categoryMap = new Map();
  products.forEach((p) => {
    const cat = p.category || p.categoryId;
    if (cat && cat.name) {
      categoryMap.set(cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'), cat.name);
    }
  });
  const categories = Array.from(categoryMap.entries()).map(([slug, name]) => ({ slug, name }));

  // Filtered and sorted products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    const cat = p.category || p.categoryId;
    const catSlug = cat?.slug || cat?.name?.toLowerCase().replace(/\s+/g, '-');
    return catSlug === selectedCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return (a.price || a.basePrice || 0) - (b.price || b.basePrice || 0);
    if (sortBy === 'price_desc') return (b.price || b.basePrice || 0) - (a.price || a.basePrice || 0);
    if (sortBy === 'rating') return (b.ratings?.average || 0) - (a.ratings?.average || 0);
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  // Spotlight #1 Hero Product
  const spotlightProduct = products[0] || null;

  const handleSpotlightAddToCart = () => {
    if (!spotlightProduct) return;
    const defaultVariant = spotlightProduct.variants?.[0] || {};
    dispatch(
      addToCart({
        product: spotlightProduct,
        variantId: defaultVariant._id || defaultVariant.sku || spotlightProduct._id,
        quantity: 1
      })
    );
    dispatch(
      addToast({
        type: 'success',
        message: `Added "${spotlightProduct.title}" to your bag`
      })
    );
    setSpotlightAdded(true);
    setTimeout(() => setSpotlightAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
          Unlocking the MOSMAC Select Vault...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SeoHead
        title="MOSMAC Select | The Private Luxury Curation Vault"
        description="Explore MOSMAC Select — handpicked signature beauty formulas, professional applicator tools, and dermatologist-tested cosmetic icons curated for discerning connoisseurs."
        canonicalUrl="/mosmac-select"
      />

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="flex items-center space-x-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-900 flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-semibold">MOSMAC Select</span>
        </nav>
      </div>

      {/* 1. Editorial Luxury Hero (Matching Mosmac Store Light Warm Palette) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fdf6f2] via-[#faece7] to-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-rose-200/50">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-900 text-xs font-bold tracking-widest uppercase shadow-2xs">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>MOSMAC SELECT CURATION</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-gray-950 leading-tight">
            Curated For The Connoisseur.
            <br />
            <span className="bg-gradient-to-r from-amber-700 via-rose-600 to-amber-800 bg-clip-text text-transparent">
              Certified Luxury Provenance.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Every creation in the MOSMAC Select catalogue undergoes rigorous scrutiny by our beauty directors — chosen exclusively for uncompromising formulation, clinical grade safety, and professional finish.
          </p>

          {/* Luxury Quality Seal Badges */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-medium text-gray-700">
            <span className="flex items-center gap-1.5 bg-white border border-rose-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> 100% Brand Authenticity
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-rose-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Hand-Inspected Quality
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-rose-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
              <Award className="w-3.5 h-3.5 text-emerald-600" /> Dermatologically Approved
            </span>
          </div>
        </div>
      </section>

      {/* 2. Spotlight Premiere Hero Showcase (Item #1 of Select) */}
      {spotlightProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#fbf2ed] via-[#faece7] to-[#f7ded4] p-6 sm:p-10 lg:p-12 shadow-sm border border-rose-200/70 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-200/40 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              {/* Product Visual */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-white shadow-xs border border-rose-100 p-6 group">
                  <img
                    src={spotlightProduct.imageUrl || spotlightProduct.images?.[0]?.url}
                    alt={spotlightProduct.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-amber-500 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />
                    <span>CURATOR'S SPOTLIGHT</span>
                  </div>
                </div>
              </div>

              {/* Product Story & Highlights */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-widest text-amber-800 font-extrabold">
                    PREMIERE SELECTION OF THE MONTH
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-950">
                    {spotlightProduct.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Engineered for seamless precision and long-wearing luxury. Selected by our directors for its unmatched ergonomics, ultra-soft cruelty-free bristles, and flawless cosmetic application.
                  </p>
                </div>

                {/* Price & Discount Bar */}
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-2xl sm:text-3xl font-black text-gray-950">
                    ₹{spotlightProduct.price || (spotlightProduct.basePrice ? spotlightProduct.basePrice / 100 : 0)}
                  </span>
                  {(spotlightProduct.mrp || spotlightProduct.baseMrp) > (spotlightProduct.price || (spotlightProduct.basePrice / 100)) && (
                    <>
                      <span className="text-sm sm:text-base text-gray-400 line-through">
                        ₹{spotlightProduct.mrp || (spotlightProduct.baseMrp ? spotlightProduct.baseMrp / 100 : 0)}
                      </span>
                      <span className="text-xs font-bold text-rose-600 bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-200">
                        {spotlightProduct.discountPercentage}% OFF
                      </span>
                    </>
                  )}
                </div>

                {/* Formula Standards Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 rounded-xl bg-white border border-rose-100 flex items-center gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-gray-800 font-medium">Cruelty-Free</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-rose-100 flex items-center gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs text-gray-800 font-medium">Eco Bamboo Handle</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-rose-100 flex items-center gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs text-gray-800 font-medium">Pro Studio Quality</span>
                  </div>
                </div>

                {/* Call To Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-3">
                  <button
                    type="button"
                    onClick={handleSpotlightAddToCart}
                    className="px-6 py-3 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-extrabold text-sm flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{spotlightAdded ? 'Added to Bag!' : 'Add Spotlight Pick to Bag'}</span>
                  </button>

                  <Link
                    to={`/product/${spotlightProduct.slug}`}
                    className="px-5 py-3 rounded-xl bg-white hover:bg-rose-50 text-gray-900 font-bold text-sm flex items-center gap-2 border border-gray-200 transition-all shadow-2xs"
                  >
                    <span>Inspect Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Curated Select Collection Grid with Filter & Sort */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OFFICIAL SELECTION CATALOGUE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Curated By Our Beauty Directors
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Showing {sortedProducts.length} certified items handpicked from the MOSMAC Select vault.
            </p>
          </div>

          {/* Filter Pills & Sort Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setSelectedCategory(c.slug)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedCategory === c.slug
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="curator">Curator's Sequence</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedProducts.map((product) => (
            <div key={product._id} className="relative group">
              <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md shadow-xs pointer-events-none">
                ✦ SELECT SEAL
              </div>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      {/* 4. The 4 Pillars of MOSMAC Select Uniqueness */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#faece7] rounded-3xl p-8 sm:p-12 shadow-2xs border border-rose-200/60 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-800">
              THE 4 CRITERIA
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-gray-950">
              Why A Product Enters MOSMAC Select
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Fewer than 5% of cosmetic submissions make the cut. Every formula in this collection passes our strict benchmark.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h4 className="text-sm font-bold text-gray-950">Clinical Cleanliness</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Formulated strictly without harsh parabens, toxic sulfates, or micro-plastics.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h4 className="text-sm font-bold text-gray-950">Ultra Pigment Payoff</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Micro-milled pigments that deliver true-to-tone intensity across all Indian undertones.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h4 className="text-sm font-bold text-gray-950">Wear Longevity</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tested for heat, sweat, and humidity resistance to guarantee up to 16 hours of fresh wear.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h4 className="text-sm font-bold text-gray-950">Direct Brand Provenance</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Sourced in temperature-controlled batches straight from verified lab facilities.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MosmacSelectPage;
