import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DEFAULT_SLIDES = [
  {
    id: 'default-slide-1',
    brand: 'MOSMAC COMPLEXION',
    brandAccent: true,
    title: 'NATURAL MATTE FINISH',
    subtitle: 'Ultra Definition Liquid Foundation with Hyaluronic Acid & Vitamin E for weightless coverage.',
    ctaText: 'Explore Foundation',
    ctaLink: '/products?category=foundation-bb-cream',
    bgColor: '#EFF4F9',
    imageUrl: '/images/hero/hero-1-foundation.jpg',
    alt: 'MOSMAC Ultra Definition Liquid Foundation'
  },
  {
    id: 'default-slide-2',
    brand: 'MOSMAC FLAWLESS FINISH',
    brandAccent: true,
    title: 'TRANSLUCENT SETTING POWDER',
    subtitle: 'Airbrushed micro-fine powder that locks in makeup for all-day shine-free luxury wear.',
    ctaText: 'Shop Loose Powder',
    ctaLink: '/products?category=face',
    bgColor: '#EAEFF5',
    imageUrl: '/images/hero/hero-2-loose-powder.jpg',
    alt: 'MOSMAC Loose Setting Powder'
  },
  {
    id: 'default-slide-3',
    brand: 'MOSMAC PRO COSMETICS',
    brandAccent: true,
    title: '16-COLOR PIGMENTED PALETTE',
    subtitle: 'High pigment shimmer and matte tones crafted for bold Indian festive and everyday glam.',
    ctaText: 'Explore Eyeshadow',
    ctaLink: '/products?category=eyeshadow-palettes',
    bgColor: '#F5EFEA',
    imageUrl: '/images/hero/hero-3-eyeshadow-palette.jpg',
    alt: 'MOSMAC IMAGIC Eyeshadow Palette'
  },
  {
    id: 'default-slide-4',
    brand: 'MOSMAC EYE CARE',
    brandAccent: true,
    title: 'NO SMUDGE PRECISION EYELINER',
    subtitle: 'Unique long-lasting waterproof matte eyeliner formula that is safe and gentle for your eyes.',
    ctaText: 'Shop Eyeliner & Kajal',
    ctaLink: '/products?category=eyeliner-kajal',
    bgColor: '#F4EFEA',
    imageUrl: '/images/hero/hero-4-eyeliner.jpg',
    alt: 'MOSMAC No Smudge Eyeliner'
  },
  {
    id: 'default-slide-5',
    brand: 'MOSMAC LIP CARE',
    brandAccent: true,
    title: 'CHERRY LIP BALM SPF 50',
    subtitle: '1% Kojic Acid + Ceramides with SPF 50 PA++++ for deeply nourished and sun-protected lips.',
    ctaText: 'Explore Lip Care',
    ctaLink: '/products?category=lipstick-lip-crayon',
    bgColor: '#F6ECEB',
    imageUrl: '/images/hero/hero-5-lip-balm.jpg',
    alt: 'MOSMAC Cherry Lip Balm SPF 50'
  }
];

export function HeroCarousel({ cmsBanners = [] }) {
  // Map admin banners if present
  const adminSlides = (cmsBanners || []).map((b, index) => {
    const bgColors = ['#EFF4F9', '#EAEFF5', '#F5EFEA', '#F4EFEA', '#F6ECEB'];
    return {
      id: b.id || b._id || `admin-slide-${index}`,
      brand: b.badge || 'FEATURED CAMPAIGN',
      brandAccent: true,
      title: b.title || 'EXCLUSIVE OFFER',
      subtitle: b.subtitle || 'Shop certified genuine products with express delivery & brand warranty.',
      ctaText: b.ctaText || b.ctaLabel || 'Shop Now',
      ctaLink: b.ctaLink || b.ctaDestination || '/products',
      bgColor: b.bgColor || bgColors[index % bgColors.length],
      imageUrl: b.desktopImageUrl || b.imageUrl || DEFAULT_SLIDES[index % DEFAULT_SLIDES.length].imageUrl,
      mobileImageUrl: b.mobileImageUrl,
      alt: b.alt || b.altText || b.title || 'Featured Campaign'
    };
  });

  // Exactly 5 slides total rule:
  // If admin has 0 -> 5 defaults
  // If admin has 1 -> 1 admin + 4 defaults
  // If admin has 2 -> 2 admin + 3 defaults
  // If admin has 3 -> 3 admin + 2 defaults
  // If admin has 4 -> 4 admin + 1 default
  // If admin has 5+ -> all admin banners
  const neededDefaults = Math.max(0, 5 - adminSlides.length);
  const fallbackSlides = DEFAULT_SLIDES.slice(0, neededDefaults);
  const slides = [...adminSlides, ...fallbackSlides];

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const total = slides.length;

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + total) % total);
  };

  // Hardcoded autoplay setting (5 seconds per slide, pause on user hover)
  useEffect(() => {
    if (isPaused || total <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total]);

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel Track Container with Rounded Corners */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
        {/* Horizontal Sliding Track (Hardcoded smooth transition) */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id || index}
              className="w-full shrink-0 min-w-full relative min-h-[320px] sm:min-h-[400px] lg:min-h-[460px] flex items-center"
              style={{ backgroundColor: slide.bgColor }}
            >
              {/* Subtle geometric line pattern in background */}
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-15 pointer-events-none overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="200,20 380,200 200,380 20,200" stroke="#000" strokeWidth="1.5" />
                  <polygon points="200,60 340,200 200,340 60,200" stroke="#000" strokeWidth="1" />
                  <polygon points="200,100 300,200 200,300 100,200" stroke="#000" strokeWidth="0.8" />
                  <line x1="20" y1="200" x2="380" y2="200" stroke="#000" strokeWidth="1" />
                  <line x1="200" y1="20" x2="200" y2="380" stroke="#000" strokeWidth="1" />
                </svg>
              </div>

              {/* Slide Content Grid */}
              <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-12 items-center px-6 sm:px-12 lg:px-16 py-8 sm:py-12 gap-8">
                {/* Left Text Column */}
                <div className="md:col-span-6 lg:col-span-5 space-y-4 sm:space-y-6 text-left">
                  {/* Brand / Campaign Badge */}
                  {slide.brand && (
                    <div className="flex items-center gap-2">
                      {slide.brandAccent && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-[#E04038] transform rotate-45" />
                          <span className="w-1.5 h-1.5 bg-[#E04038] transform rotate-45" />
                          <span className="w-1.5 h-1.5 bg-[#E04038] transform rotate-45" />
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-black tracking-widest text-gray-900 uppercase font-sans">
                        {slide.brand}
                      </span>
                    </div>
                  )}

                  {/* Headline */}
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-none uppercase">
                    {slide.title}
                  </h1>

                  {/* Subtitle */}
                  <p className="text-sm sm:text-base text-gray-700 font-normal max-w-md leading-relaxed">
                    {slide.subtitle}
                  </p>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <Link to={slide.ctaLink || '/products'}>
                      <button
                        type="button"
                        className="bg-black hover:bg-gray-800 text-white font-medium px-8 py-3 rounded-lg text-sm transition-all duration-150 shadow-sm hover:shadow active:scale-95"
                      >
                        {slide.ctaText || 'Shop Now'}
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Right Showcase Image Column */}
                <div className="md:col-span-6 lg:col-span-7 flex items-center justify-center relative">
                  <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl h-64 sm:h-80 lg:h-96 flex items-center justify-center">
                    {/* Soft pedestal shadow */}
                    <div className="absolute bottom-4 sm:bottom-6 w-3/4 h-8 bg-black/10 rounded-full blur-md" />

                    <img
                      src={slide.imageUrl}
                      alt={slide.alt}
                      className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-xl transition-all duration-500 rounded-xl"
                      onError={(e) => {
                        e.target.src = DEFAULT_SLIDES[index % DEFAULT_SLIDES.length].imageUrl;
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Prev/Next Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md backdrop-blur-xs transition-transform duration-150 hover:scale-105 active:scale-95 z-20 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2]" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md backdrop-blur-xs transition-transform duration-150 hover:scale-105 active:scale-95 z-20 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[2]" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Indicators (Active pill indicator + inactive dots) */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                i === current
                  ? 'w-7 h-1.5 bg-black'
                  : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroCarousel;
