import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package
} from 'lucide-react';
import { storefrontService } from '@/services/storefrontService';
import { cmsService } from '@/services/cmsService';
import { homepageSectionService } from '@/services/homepageSectionService';
import ProductCard from '@/components/product/ProductCard';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import HeroAccordionGallery from '@/components/home/HeroAccordionGallery';
import HeroCarousel from '@/components/home/HeroCarousel';
import OffersRibbonBanner from '@/components/home/OffersRibbonBanner';
import { BrandStylizedLogo } from '@/components/layout/BrandsMegaMenu';
import { SeoHead, buildOrganizationSchema, buildWebSiteSchema } from '@/components/common/SeoHead';

const RECENTLY_VIEWED_KEY = 'aurora_recently_viewed';

export function HomePage() {
  const [data, setData] = useState(null);
  const [dynamicSections, setDynamicSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const featuredCarouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    async function loadHome() {
      setIsLoading(true);
      setError('');
      try {
        const [homeData, cmsLayout, cmsBanners, storefrontSections] = await Promise.all([
          storefrontService.getHomepageData().catch(() => null),
          cmsService.getHomepageLayout().catch(() => []),
          cmsService.getPublicBanners('hero').catch(() => []),
          homepageSectionService.getStorefrontSections().catch(() => [])
        ]);

        const mergedData = { ...(homeData || {}) };
        if (cmsBanners && cmsBanners.length > 0) {
          mergedData.heroBanners = cmsBanners.map((b) => ({
            id: b._id,
            title: b.title,
            subtitle: b.subtitle,
            ctaText: b.ctaLabel || 'Shop Now',
            ctaLink: b.ctaDestination || '/products',
            imageUrl: b.desktopImageUrl,
            desktopImageUrl: b.desktopImageUrl,
            mobileImageUrl: b.mobileImageUrl,
            badge: 'FEATURED CAMPAIGN'
          }));
        } else {
          mergedData.heroBanners = [];
        }
        mergedData.cmsSections = cmsLayout || [];
        setData(mergedData);
        const resolvedSections =
          Array.isArray(storefrontSections) && storefrontSections.length > 0
            ? storefrontSections
            : Array.isArray(homeData?.dynamicSections) && homeData.dynamicSections.length > 0
            ? homeData.dynamicSections
            : [];
        setDynamicSections(resolvedSections);
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

  const categoriesToDisplay =
    data?.featuredCategories && data.featuredCategories.length > 0
      ? data.featuredCategories
      : data?.categories || [];

  const featuredSection = dynamicSections.find((s) => s.slug === 'featured');
  // Only active if the section exists in dynamicSections (which filters isActive: true) and has products
  const isFeaturedActive = Boolean(
    featuredSection &&
    featuredSection.isActive !== false &&
    Array.isArray(featuredSection.products) &&
    featuredSection.products.length > 0
  );
  const featuredProductsList = isFeaturedActive ? featuredSection.products : [];

  const featuredHeading = featuredSection?.heading || featuredSection?.name || 'Featured Collection';
  const featuredSubtitle = featuredSection?.subtitle || 'Handcrafted formulas, dermatologically tested and certified genuine';
  const featuredViewAllLink = featuredSection?.viewAllLink || '/products?section=featured';
  const featuredMaxProducts = featuredSection?.maxProducts || 12;
  const displayedFeaturedProducts = featuredProductsList.slice(0, featuredMaxProducts);
  const isCarousel = displayedFeaturedProducts.length > 4;

  const checkCarouselScroll = () => {
    if (featuredCarouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = featuredCarouselRef.current;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
    }
  };

  useEffect(() => {
    checkCarouselScroll();
    const handleResize = () => checkCarouselScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [displayedFeaturedProducts]);

  const scrollCarousel = (direction) => {
    if (featuredCarouselRef.current) {
      const { clientWidth } = featuredCarouselRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      featuredCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkCarouselScroll, 350);
    }
  };

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      <SeoHead
        title="Mosmac | Modern Luxury Cosmetics & Beauty Platform"
        description="Discover handpicked luxury cosmetics, makeup, skincare, and everyday beauty essentials on Mosmac with pan-India delivery, Cash on Delivery, and genuine quality guarantee."
        canonicalUrl="/"
        jsonLd={[buildWebSiteSchema(), buildOrganizationSchema()]}
      />

      {/* 1. Flagship Hero Accordion Gallery (React Bits) */}
      <HeroAccordionGallery cmsBanners={data?.heroBanners || []} />

      {/* 2. Top Categories Showcase (Matching Reference Screenshot) */}
      {categoriesToDisplay.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Top Categories
            </h2>
            <Link
              to="/products"
              className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-black flex items-center gap-1 group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 pt-1">
            {categoriesToDisplay.slice(0, 8).map((cat) => (
              <Link
                key={cat._id}
                to={`/category/${cat.slug}`}
                className="group flex flex-col items-center text-center gap-2"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-50 border border-gray-200 p-1 overflow-hidden group-hover:border-gray-900 group-hover:shadow-md transition-all flex items-center justify-center">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-rose-50 via-orange-50 to-amber-50 flex items-center justify-center text-gray-700 font-bold text-sm sm:text-base">
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-800 group-hover:text-black transition-colors line-clamp-1 max-w-[90px]">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Editorial "Get The Look" & Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`bg-[#f2ded7] rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs ${isFeaturedActive ? 'space-y-8' : ''}`}>
          {/* Top Editorial Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 lg:col-span-5 space-y-3.5 sm:space-y-4">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight leading-tight">
                Signature Glam
              </h2>
              <p className="text-sm sm:text-base text-gray-700 max-w-md leading-relaxed font-normal">
                Professional touch, seamless blending, and radiant finish for every occasion
              </p>
              <div>
                <Link
                  to="/products?category=face-makeup"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-950 hover:text-rose-700 group transition-colors"
                >
                  <span className="border-b border-gray-950 group-hover:border-rose-700 pb-0.5">Explore Collection</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="md:col-span-6 lg:col-span-7 flex justify-end">
              <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-sm border border-white/40">
                <img
                  src="/images/editorial/get-the-look-model.jpg"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://static.vecteezy.com/system/resources/thumbnails/024/101/572/small/applying-tone-to-skin-beautiful-woman-face-hand-of-visagiste-painting-cosmetics-beauty-model-girl-make-up-ai-generated-photo.jpg';
                  }}
                  alt="Get The Look - Soft washes of pink and luminous skin"
                  className="w-full h-56 sm:h-64 md:h-72 object-cover object-center hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Featured Products Showcase (Controlled by Admin Panel Homepage Sections) */}
          {isFeaturedActive && (
            <div className="space-y-4 pt-4 border-t border-black/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    {featuredHeading}
                  </h3>
                  {featuredSubtitle && (
                    <p className="text-xs text-gray-600 mt-0.5">{featuredSubtitle}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  {isCarousel && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollCarousel('left')}
                        disabled={!canScrollLeft}
                        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-xs transition-all border border-black/5 hover:scale-105 active:scale-95"
                        aria-label="Previous products"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollCarousel('right')}
                        disabled={!canScrollRight}
                        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-xs transition-all border border-black/5 hover:scale-105 active:scale-95"
                        aria-label="Next products"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <Link
                    to={featuredViewAllLink}
                    className="text-xs sm:text-sm font-semibold text-gray-800 hover:text-gray-950 flex items-center gap-1 group shrink-0"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-gray-600">Loading products...</p>
                </div>
              ) : displayedFeaturedProducts.length === 0 ? (
                <div className="py-12 text-center bg-white/80 rounded-2xl border border-white/60 p-6">
                  <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-gray-900">No products available</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Check back soon for new arrivals.</p>
                </div>
              ) : isCarousel ? (
                <div
                  ref={featuredCarouselRef}
                  onScroll={checkCarouselScroll}
                  className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory pb-3 pt-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {displayedFeaturedProducts.map((product) => (
                    <div
                      key={product._id}
                      className="shrink-0 snap-start w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-15px)]"
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {displayedFeaturedProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Offers Ribbon Marquee Banner (Directly Below Featured Section) */}
      <OffersRibbonBanner offers={data?.promotionalOffers || []} />

      {/* Dynamic Admin-Managed Homepage Sections */}
      {dynamicSections && dynamicSections.length > 0 && (
        <div className="space-y-12">
          {dynamicSections
            .filter((sec) => sec.slug !== 'featured' && sec.isActive !== false && Array.isArray(sec.products) && sec.products.length > 0)
            .sort((a, b) => (a.displayPosition || 0) - (b.displayPosition || 0))
            .map((section) => (
              <section key={section._id || section.slug} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
                <div className="flex items-end justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                      {section.heading || section.name}
                    </h2>
                    {section.subtitle && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {section.subtitle}
                      </p>
                    )}
                  </div>

                  {section.showViewAll && (
                    <Link
                      to={section.viewAllLink || `/products?section=${section.slug}`}
                      className="text-xs sm:text-sm font-bold text-gray-800 hover:text-[#E03A30] flex items-center gap-1 group transition-colors"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {section.products.slice(0, section.maxProducts || 8).map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* 5. Brand Showcase */}
      {data?.brands && data.brands.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Featured Brands</h2>
            <p className="text-xs text-gray-500 font-medium">Official verified brand partners & authorized flagships</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2">
            {data.brands.map((brand) => (
              <Link
                key={brand._id}
                to={`/products?brand=${brand.slug}`}
                className="group relative flex flex-col items-center justify-center h-20 sm:h-24 w-44 sm:w-52 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#E03A30] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                title={`Shop ${brand.name}`}
              >
                <div className="h-10 w-full flex items-center justify-center">
                  <BrandStylizedLogo name={brand.name} logoUrl={brand.logoUrl} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-900 mt-1 truncate max-w-[90%] transition-colors">
                  {brand.name}
                </span>
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
