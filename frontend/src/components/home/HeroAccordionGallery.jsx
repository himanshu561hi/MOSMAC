/**
 * HeroAccordionGallery.jsx
 *
 * Enterprise Storefront Hero Component
 * Orchestrates dynamic Admin CMS Banners with high-fidelity MOSMAC defaults
 * Enforces the strict 5-panel guarantee (Admin Banners + Flagship Defaults = 5 Panels)
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import AccordionGallery from '@/components/ui/AccordionGallery';
import MobileHeroSlider from '@/components/home/MobileHeroSlider';

export const FLAGSHIP_DEFAULTS = [
  {
    id: 'default-1',
    badge: 'MOSMAC COMPLEXION',
    label: 'Ultra Definition Liquid Foundation',
    price: '₹999',
    originalPrice: '₹1,299',
    rating: '4.9',
    tag: 'Bestseller',
    image: '/images/hero/hero-1-foundation.jpg',
    link: '/product/mosmac-ultra-definition-liquid-foundation-30-ml',
    alt: 'MOSMAC Ultra Definition Liquid Foundation'
  },
  {
    id: 'default-2',
    badge: 'FLAWLESS FINISH',
    label: 'Translucent Loose Setting Powder',
    price: '₹599',
    originalPrice: '₹799',
    rating: '4.8',
    tag: 'Award Winner',
    image: '/images/hero/hero-2-loose-powder.jpg',
    link: '/product/mosmac-loose-powder',
    alt: 'MOSMAC Loose Setting Powder'
  },
  {
    id: 'default-3',
    badge: 'PRO EYE PALETTE',
    label: '16-Color Pigmented Eyeshadow Palette',
    price: '₹1,199',
    originalPrice: '₹1,599',
    rating: '4.9',
    tag: 'Trending',
    image: '/images/hero/hero-3-eyeshadow-palette.jpg',
    link: '/product/imagic-charm-16-color-eyeshadow-palette',
    alt: 'IMAGIC Charm 16 Color Eyeshadow Palette'
  },
  {
    id: 'default-4',
    badge: 'LONG WEAR LINER',
    label: 'Long-Lasting No Smudge Eyeliner',
    price: '₹349',
    originalPrice: '₹499',
    rating: '4.7',
    tag: 'Waterproof',
    image: '/images/hero/hero-4-eyeliner.jpg',
    link: '/product/mosmac-no-smudge-eyeliner',
    alt: 'MOSMAC No Smudge Eyeliner'
  },
  {
    id: 'default-5',
    badge: 'SPF 50 LIP CARE',
    label: 'Cherry Lip Balm SPF 50 PA++++',
    price: '₹299',
    originalPrice: '₹399',
    rating: '4.8',
    tag: 'New Launch',
    image: '/images/hero/hero-5-lip-balm.jpg',
    link: '/product/mosmac-cherry-lip-balm-spf-50-paplusplusplusplus-4-5-g',
    alt: 'MOSMAC Cherry Lip Balm SPF 50'
  }
];

export function HeroAccordionGallery({ cmsBanners = [], featuredProducts = [] }) {
  // Combine Admin Banners / Featured Products with Defaults to maintain exactly 5 panels
  const items = useMemo(() => {
    // 1. If admin configured explicit hero banners
    if (cmsBanners && cmsBanners.length > 0) {
      const adminItems = cmsBanners.map((banner, index) => ({
        id: banner.id || banner._id || `admin-panel-${index}`,
        badge: banner.badge || 'FEATURED CAMPAIGN',
        label: banner.title || 'Exclusive Collection',
        image: banner.desktopImageUrl || banner.imageUrl || FLAGSHIP_DEFAULTS[index % FLAGSHIP_DEFAULTS.length].image,
        link: banner.ctaDestination || banner.ctaLink || '/products',
        alt: banner.altText || banner.title || 'MOSMAC Campaign',
        tag: 'Featured'
      }));

      const neededDefaults = Math.max(0, 5 - adminItems.length);
      const fallbackPanels = FLAGSHIP_DEFAULTS.slice(0, neededDefaults);
      return [...adminItems, ...fallbackPanels];
    }

    // 2. If real featured products exist, build dynamic panels with direct product page links
    if (featuredProducts && featuredProducts.length >= 5) {
      return featuredProducts.slice(0, 5).map((prod) => ({
        id: prod._id,
        badge: prod.brandId?.name ? `MOSMAC × ${prod.brandId.name}` : (prod.category?.name || 'FEATURED BEAUTY'),
        label: prod.title,
        price: prod.price ? `₹${prod.price.toLocaleString('en-IN')}` : undefined,
        originalPrice: prod.compareAtPrice ? `₹${prod.compareAtPrice.toLocaleString('en-IN')}` : undefined,
        rating: '4.9',
        tag: 'Flagship',
        image: prod.images?.[0]?.url || FLAGSHIP_DEFAULTS[0].image,
        link: `/product/${prod.slug}`,
        alt: prod.title
      }));
    }

    // 3. High-fidelity flagship defaults with direct product page links
    return FLAGSHIP_DEFAULTS;
  }, [cmsBanners, featuredProducts]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-3">
      {/* Top Eyebrow Bar */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-[#E03A30] uppercase bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100/80">
            <Sparkles className="w-3 h-3 text-[#E03A30]" /> Flagship Showcase
          </span>
          <span className="hidden sm:inline-block text-xs text-gray-500 font-medium">
            Hover to expand & explore curated products
          </span>
        </div>

        <Link
          to="/products"
          className="text-xs font-bold text-gray-700 hover:text-[#E03A30] flex items-center gap-1 transition-colors group"
        >
          <span>View All Products</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Desktop: React Bits AccordionGallery Component */}
      <div className="hidden md:block">
        <AccordionGallery
          items={items}
          defaultIndex={0}
          height={480}
          radius={20}
          gap={12}
          accentColor="#E03A30"
          overlayColor="#05030a"
          textColor="#ffffff"
          trigger="hover"
          duration={0.55}
          ease="power2.out"
          parallax={0}
          tilt={0}
          stagger={0.05}
          showLabels={true}
          grayscale={false}
          className="shadow-xl"
        />
      </div>

      {/* Mobile (Phones): Touch Swipeable Hero Slidebar */}
      <div className="block md:hidden">
        <MobileHeroSlider items={items} />
      </div>
    </section>
  );
}

export default HeroAccordionGallery;
