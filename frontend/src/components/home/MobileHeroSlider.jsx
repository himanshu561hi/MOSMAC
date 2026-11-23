import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Star } from 'lucide-react';

export function MobileHeroSlider({ items = [] }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = items.length;

  const timerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx) => {
    setCurrentIndex(idx);
  };

  // Autoplay timer
  useEffect(() => {
    if (isPaused || total <= 1) return;

    timerRef.current = setInterval(() => {
      goToNext();
    }, 4200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total, goToNext]);

  // Touch swipe handling
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartXRef.current - touchEndXRef.current;
    const threshold = 45; // min 45px swipe
    if (diff > threshold) {
      goToNext();
    } else if (diff < -threshold) {
      goToPrev();
    }
    // resume autoplay after 2.5s of touch end
    setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  // Mouse drag support for desktop responsive emulation
  const handleMouseDown = (e) => {
    setIsPaused(true);
    isDraggingRef.current = true;
    touchStartXRef.current = e.clientX;
    touchEndXRef.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    touchEndXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const threshold = 45;
    if (diff > threshold) {
      goToNext();
    } else if (diff < -threshold) {
      goToPrev();
    }
    setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide Track */}
      <div
        className="flex transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          const bgGradients = [
            'from-[#070b19] via-[#0f172a] to-[#1e1b4b]',
            'from-[#140b17] via-[#240e24] to-[#3b0764]',
            'from-[#180d0d] via-[#2a1215] to-[#450a0a]',
            'from-[#091512] via-[#0f291e] to-[#064e3b]',
            'from-[#1c1308] via-[#2d1c0c] to-[#451a03]'
          ];
          const bgGradient = bgGradients[index % bgGradients.length];

          return (
            <div
              key={item.id || index}
              className="w-full shrink-0 min-w-full px-1"
            >
              <div
                className={`relative w-full h-[410px] sm:h-[450px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md flex flex-col justify-end bg-gradient-to-t ${bgGradient}`}
              >
                {/* Background Image with Fallback */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={item.image}
                    alt={item.alt || item.label || 'MOSMAC Product'}
                    className="w-full h-full object-cover object-center filter brightness-[0.92] transition-transform duration-700 ease-out scale-100"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/hero/hero-1-foundation.jpg';
                    }}
                  />
                  {/* Cinematic Bottom Gradient Overlay so all typography is crisp */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/20" />
                </div>

                {/* Top Badge Overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                  {item.badge ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-white uppercase bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-xs">
                      <Sparkles className="w-3 h-3 text-[#E03A30]" />
                      {item.badge}
                    </span>
                  ) : <span />}

                  {item.rating && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/30 shadow-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {item.rating}
                    </span>
                  )}
                </div>

                {/* Content Area (Pinned at Bottom) */}
                <div className="relative z-10 p-5 sm:p-7 space-y-3">
                  {/* Category / Campaign Tag */}
                  {item.tag && (
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-[#ff6b62] bg-[#E03A30]/15 px-2 py-0.5 rounded border border-[#E03A30]/30">
                      {item.tag}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug line-clamp-2 drop-shadow-sm font-sans">
                    {item.label}
                  </h3>

                  {/* Pricing Details */}
                  {item.price && (
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-lg font-black text-white tracking-tight">
                        {item.price}
                      </span>
                      {item.originalPrice && (
                        <span className="text-xs text-white/60 line-through">
                          {item.originalPrice}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-1">
                    <Link
                      to={item.link || '/products'}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-5 rounded-xl bg-[#E03A30] hover:bg-[#c93229] active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    >
                      <span>Shop Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next Floating Arrow Buttons */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            aria-label="Previous slide"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 active:scale-95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all z-20 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Next slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 active:scale-95 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-md transition-all z-20 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Pagination Indicators (Active pill + inactive dots) */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-3">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                i === currentIndex
                  ? 'w-6 h-1.5 bg-[#E03A30]'
                  : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileHeroSlider;
