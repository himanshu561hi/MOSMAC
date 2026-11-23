import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

export const HERO_SLIDES = [
  {
    id: 'slide-1',
    badge: 'MOSMAC COMPLEXION',
    title: 'Ultra Definition Liquid Foundation',
    subtitle: 'Woke Up Like This • 18 Diverse Shades • Natural-Matte Finish',
    image: '/images/hero/hero-1-foundation.jpg',
    link: '/products',
    ctaText: 'Shop Foundation',
    bgColor: 'from-amber-950/40 via-stone-900/60 to-slate-950'
  },
  {
    id: 'slide-2',
    badge: 'MOSMAC FLAWLESS FINISH',
    title: 'Translucent Loose Setting Powder',
    subtitle: 'Micro-Fine Blur Technology • All-Day Oil Control • Featherweight',
    image: '/images/hero/hero-2-loose-powder.jpg',
    link: '/products',
    ctaText: 'Shop Powder',
    bgColor: 'from-stone-900/40 via-zinc-900/60 to-slate-950'
  },
  {
    id: 'slide-3',
    badge: 'MOSMAC PRO COSMETICS',
    title: '16-Color Pigmented Eyeshadow Palette',
    subtitle: 'High-Impact Pigments • Velvety Mattes & Shimmers • Day-to-Night Looks',
    image: '/images/hero/hero-3-eyeshadow-palette.jpg',
    link: '/products',
    ctaText: 'Shop Palette',
    bgColor: 'from-rose-950/40 via-neutral-900/60 to-slate-950'
  },
  {
    id: 'slide-4',
    badge: 'MOSMAC EYE CARE',
    title: 'Long-Lasting No Smudge Eyeliner',
    subtitle: 'Unique Safe Formula • Intense Jet Black • 24hr Waterproof Precision',
    image: '/images/hero/hero-4-eyeliner.jpg',
    link: '/products',
    ctaText: 'Shop Eyeliner',
    bgColor: 'from-pink-950/40 via-zinc-900/60 to-slate-950'
  },
  {
    id: 'slide-5',
    badge: 'MOSMAC DERMA CARE',
    title: 'Cherry Lip Balm SPF 50 PA++++',
    subtitle: '1% Kojic Acid + Ceramides • Sun Protection • Deep Hydration',
    image: '/images/hero/hero-5-lip-balm.jpg',
    link: '/products',
    ctaText: 'Shop Lip Balm',
    bgColor: 'from-red-950/40 via-slate-900/60 to-slate-950'
  }
];

export function HeroBannerCarousel({ slides = HERO_SLIDES }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const activeSlides = slides && slides.length > 0 ? slides : HERO_SLIDES;
  const count = activeSlides.length;

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [handleNext, isPaused, count]);

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const currentSlide = activeSlides[currentIndex];

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Eyebrow Bar */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-[#E03A30] uppercase bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100/80">
            <Sparkles className="w-3 h-3 text-[#E03A30]" /> Flagship Showcase
          </span>
          <span className="hidden sm:inline-block text-xs text-gray-500 font-medium">
            MOSMAC Beauty & Personal Care Collection
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

      {/* Main Carousel Banner Frame */}
      <div
        className="relative overflow-hidden rounded-3xl bg-slate-950 border border-gray-900 shadow-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ambient Blur Background (No Harsh Black Bars) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 blur-3xl scale-125">
          <img
            src={currentSlide.image}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover transition-all duration-700"
          />
        </div>

        {/* Ambient Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r ${currentSlide.bgColor || 'from-slate-950/80 to-slate-950/90'} pointer-events-none`} />

        {/* Slide Content Layout: Left Promo Info, Right 100% Uncut Image */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 p-6 sm:p-10 min-h-[460px] md:min-h-[500px]">
          {/* Left Column: Text & CTA */}
          <div className="lg:col-span-6 space-y-4 text-white order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-extrabold tracking-wider uppercase text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {currentSlide.badge}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {currentSlide.title}
            </h1>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-lg">
              {currentSlide.subtitle}
            </p>

            <div className="pt-2 flex items-center gap-4">
              <Link
                to={currentSlide.link || '/products'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#E03A30] hover:bg-[#c93229] text-white text-sm font-bold shadow-lg shadow-rose-950/40 transition-all hover:scale-105 active:scale-95"
              >
                <span>{currentSlide.ctaText || 'Explore Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <span className="text-xs text-gray-400 font-medium">
                100% Genuine MOSMAC Certified
              </span>
            </div>
          </div>

          {/* Right Column: Full Creative (NO CROPPING / ZERO CUT) */}
          <div className="lg:col-span-6 flex items-center justify-center order-1 lg:order-2">
            <Link
              to={currentSlide.link || '/products'}
              className="group relative block w-full max-w-[440px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-500 hover:scale-[1.02]"
            >
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                className="w-full h-full object-contain bg-black/40 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </Link>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Bottom Pagination Dots & Thumbnails */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {activeSlides.map((slide, idx) => (
            <button
              key={slide.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex
                  ? 'w-8 h-2.5 bg-[#E03A30]'
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HeroBannerCarousel;
