import React, { useMemo } from 'react';
import { Sparkles, ShieldCheck, Truck, RotateCcw, ArrowRight } from 'lucide-react';
import InfiniteSpiral from '@/components/ui/InfiniteSpiral';
import { BrandStylizedLogo } from '@/components/layout/BrandsMegaMenu';

// Curated backup showcase assets for beauty & cosmetics to ensure rich 3D helix visuals
const BEAUTY_SHOWCASE_FALLBACKS = [
  '/images/hero/hero-1-foundation.jpg',
  '/images/hero/hero-2-loose-powder.jpg',
  '/images/hero/hero-3-eyeshadow-palette.jpg',
  '/images/hero/hero-4-eyeliner.jpg',
  '/images/hero/hero-5-lip-balm.jpg',
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=80'
];

export function BrandHeroShowcase({
  brand,
  products = [],
  categories = [],
  selectedCategory = '',
  onSelectCategory = () => {}
}) {
  // Extract spiral items from real products + fallbacks
  const spiralItems = useMemo(() => {
    const brandProducts = products.filter((p) => {
      const pBrandSlug = p.brand?.slug || (typeof p.brand === 'string' ? p.brand : '');
      const pBrandName = p.brand?.name || '';
      return (
        pBrandSlug === brand?.slug ||
        pBrandSlug === brand?._id ||
        pBrandName.toLowerCase() === (brand?.name || '').toLowerCase()
      );
    });

    const activeList = brandProducts.length > 0 ? brandProducts : products;

    const fromProducts = activeList
      .filter((p) => p.images && p.images.length > 0)
      .map((p, idx) => ({
        id: p._id || `product-${idx}`,
        src: p.images[0]?.url || p.images[0],
        alt: p.title || 'Product Showcase',
        title: p.title,
        href: `/product/${p.slug}`
      }));

    let combined = [...fromProducts];

    // If we have actual products, loop over them to fill the 8 spiral slots with real brand products
    if (fromProducts.length > 0) {
      let loopIdx = 0;
      while (combined.length < 8) {
        const item = fromProducts[loopIdx % fromProducts.length];
        combined.push({
          ...item,
          id: `${item.id}-copy-${combined.length}`
        });
        loopIdx++;
      }
    } else {
      // If no products available at all, use curated MOSMAC beauty cosmetics fallbacks
      let fallbackIdx = 0;
      while (combined.length < 8) {
        combined.push({
          id: `beauty-fallback-${combined.length}`,
          src: BEAUTY_SHOWCASE_FALLBACKS[fallbackIdx % BEAUTY_SHOWCASE_FALLBACKS.length],
          alt: `${brand?.name || 'MOSMAC'} Luxury Beauty`,
          title: `${brand?.name || 'MOSMAC'} Exclusive Edition`,
          href: '#'
        });
        fallbackIdx++;
      }
    }

    return combined;
  }, [brand, products]);

  // Extract unique categories associated with this brand
  const categoryPills = useMemo(() => {
    const catMap = new Map();

    products.forEach((p) => {
      if (p.category) {
        const catSlug = p.category.slug || p.category;
        const catName = p.category.name || categories.find((c) => c.slug === catSlug || c._id === catSlug)?.name;
        if (catSlug && catName) {
          catMap.set(catSlug, { slug: catSlug, name: catName });
        }
      }
    });

    if (catMap.size === 0 && categories.length > 0) {
      // If products don't specify, take the top 5 store categories
      return categories.slice(0, 5).map((c) => ({ slug: c.slug, name: c.name }));
    }

    return Array.from(catMap.values());
  }, [products, categories]);

  return (
    <div className="w-full mb-8">
      {/* Dark Luxury Brand Showcase Card */}
      <div className="relative rounded-3xl overflow-hidden bg-[#0A0D14] border border-neutral-800/80 shadow-2xl">
        {/* Ambient Glow Aura */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-10 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(224,58,48,0.22)_0,rgba(124,58,237,0.14)_45%,transparent_70%)] blur-2xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center min-h-[380px] sm:min-h-[430px]">
          {/* Left Column: Brand Discovery & Story */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-white/10 text-white/90 backdrop-blur-md border border-white/10">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Official Flagship Store
              </span>
              <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">
                Discover
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase">
                  {brand?.name}
                </h1>
              </div>
              <p className="text-neutral-300 text-sm sm:text-base font-light max-w-lg leading-relaxed pt-1">
                {brand?.description ||
                  `Experience authentic ${brand?.name} luxury beauty, dermatologist-tested formulations, and premium cosmetics.`}
              </p>
            </div>

            {/* Authenticity Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs text-neutral-300">
              <div className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">100% Genuine Certified</span>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-medium">Express Pan-India Logistics</span>
              </div>
              <div className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium">Dermatologist Tested</span>
              </div>
            </div>

            {/* Dots Pagination indicator matching Tira reference */}
            <div className="flex items-center gap-1.5 pt-3">
              <span className="w-6 h-1.5 rounded-full bg-white transition-all shadow-xs" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            </div>
          </div>

          {/* Right Column: 3D Infinite Spiral Helix Showcase */}
          <div className="lg:col-span-6 relative h-[360px] sm:h-[430px] w-full flex items-center justify-center overflow-hidden p-2">
            {/* Glowing Backdrop behind Spiral */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#E03A30]/25 via-amber-500/20 to-indigo-600/25 blur-3xl animate-pulse" />
            </div>

            {/* InfiniteSpiral Component */}
            <div className="w-full h-full relative z-10 flex items-center justify-center">
              <InfiniteSpiral
                items={spiralItems}
                speed={0.55}
                animationMode="all"
                radius={155}
                cardWidth={115}
                cardHeight={115}
                verticalSpacing={56}
                perspective={1000}
                cardRadius={14}
                centerScale={1.22}
                edgeBlur={5}
                cardsPerTurn={7}
                pauseOnHover={true}
                imageFit="cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* "Shop By Categories" Filter Section matching Tira reference screenshot */}
      {categoryPills.length > 0 && (
        <div className="mt-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight text-center mb-4">
            Shop By Categories
          </h2>
          <div className="flex items-center justify-center flex-wrap gap-2.5 max-w-4xl mx-auto px-2">
            <button
              type="button"
              onClick={() => onSelectCategory('')}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
                !selectedCategory
                  ? 'bg-neutral-900 text-white shadow-md ring-2 ring-neutral-900'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
              }`}
            >
              All Products
            </button>
            {categoryPills.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? '' : cat.slug)}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-md ring-2 ring-neutral-900'
                      : 'bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandHeroShowcase;
