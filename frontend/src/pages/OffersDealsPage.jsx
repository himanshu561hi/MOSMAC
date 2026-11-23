import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Tag,
  Clock,
  Sparkles,
  Percent,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  SlidersHorizontal,
  Crown
} from 'lucide-react';
import { offersDealsService } from '@/services/offersDealsService';
import ProductCard from '@/components/product/ProductCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import TrustPillarsBanner from '@/components/common/TrustPillarsBanner';
import { SeoHead } from '@/components/common/SeoHead';

export function OffersDealsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFocusCardId, setActiveFocusCardId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 48 });

  useEffect(() => {
    async function loadOffersData() {
      try {
        setLoading(true);
        setError(null);
        const res = await offersDealsService.getOffersDealsData();
        setData(res);
      } catch (err) {
        console.error('Failed to load Offers & Deals:', err);
        setError('Failed to load exclusive offers and promotions.');
      } finally {
        setLoading(false);
      }
    }
    loadOffersData();
  }, []);

  // Daily Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
          Curating Today's Exclusive Offers & Deals...
        </p>
      </div>
    );
  }

  const config = data?.config || {};
  const visibility = config.sectionsVisibility || {
    dealsOfTheDay: true,
    offersInFocus: true,
    couponsGrid: true,
    mosmacSelect: true,
    allOffersCatalog: true
  };

  const focusCards = config.offersInFocus?.cards?.filter((c) => c.isActive !== false) || [
    { id: 'flat-25', label: 'Flat', discount: '25% Off', minDiscount: 25 },
    { id: 'min-50', label: 'Minimum', discount: '50% Off', minDiscount: 50 },
    { id: 'min-30', label: 'Minimum', discount: '30% Off', minDiscount: 30 }
  ];

  const offersProducts = data?.offersProducts || [];
  const dealsOfTheDay = data?.dealsOfTheDay || [];
  const mosmacSelectProducts = data?.mosmacSelectProducts || [];
  const coupons = data?.coupons || [];

  // Filter products by selected focus card
  const selectedFocusCard = focusCards.find((c) => c.id === activeFocusCardId);
  const focusedProducts = selectedFocusCard
    ? offersProducts.filter((p) => {
        const disc = p.discountPercentage || 0;
        return disc >= (selectedFocusCard.minDiscount || 0);
      })
    : offersProducts;

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SeoHead
        title="Offers & Exclusive Deals | MOSMAC Beauty Discounts & Flash Sales"
        description="Save up to 50% on luxury beauty, skincare, and cosmetic essentials. Explore deals of the day, active discount coupons, and limited-time price drops."
        canonicalUrl="/offers"
      />

      {/* 1. Header Banner */}
      <section className="bg-gradient-to-r from-rose-50 via-orange-50/60 to-amber-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-rose-100/60">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-bold tracking-wider uppercase">
            <Flame className="w-3.5 h-3.5" />
            <span>EXCLUSIVE PRICE DROPS & PROMOTIONS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Offers & Exclusive Deals
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Premium beauty and cosmetic essentials at special discounted prices. Direct from brand-authorized flagships with genuine quality guarantee.
          </p>
        </div>
      </section>

      {/* 2. Deals of the Day (with live countdown timer) */}
      {visibility.dealsOfTheDay !== false && dealsOfTheDay.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#E03A30] text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>LIMITED TIME</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  {config.dealsOfTheDay?.title || 'Deals of the Day'}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {config.dealsOfTheDay?.subtitle || 'Special pricing expires tonight. Grab before stock sells out.'}
              </p>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/60 px-3.5 py-1.5 rounded-xl text-rose-900 text-xs font-bold shrink-0">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Ends in:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {dealsOfTheDay.slice(0, 6).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Offers In Focus (Matching User's Reference Screenshot) */}
      {visibility.offersInFocus !== false && focusCards.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {config.offersInFocus?.title || 'Offers In Focus'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Select a tier below to instantly browse products matching that discount level.
            </p>
          </div>

          {/* Horizontal Focus Discount Cards (Matching Reference Screenshot) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {focusCards.map((card) => {
              const isSelected = activeFocusCardId === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveFocusCardId(isSelected ? null : card.id)}
                  className={`text-left p-6 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 border flex flex-col justify-center items-start shadow-xs hover:shadow-md cursor-pointer group ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#f8cfbe] via-[#f7beaa] to-[#f4ad94] border-[#E03A30] scale-[1.02] ring-2 ring-[#E03A30]/30'
                      : 'bg-[#faece6] hover:bg-[#f6dfd7] border-white/60'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {card.label}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight mt-1">
                    {card.discount}
                  </span>
                  {isSelected && (
                    <span className="text-[11px] font-bold text-[#E03A30] mt-2 inline-flex items-center gap-1">
                      <span>Active Filter Applied</span>
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Section Loaded on Basis of Clicked Focus Card */}
          {activeFocusCardId && (
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    FILTERED BY:
                  </span>
                  <span className="text-sm font-extrabold text-gray-900 bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200/60">
                    {selectedFocusCard.label} {selectedFocusCard.discount} ({focusedProducts.length} items)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFocusCardId(null)}
                  className="text-xs font-semibold text-gray-600 hover:text-black underline"
                >
                  Clear filter
                </button>
              </div>

              {focusedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {focusedProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl">
                  No products currently match this exact discount threshold.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. Active Promo Coupons & Vouchers Grid */}
      {visibility.couponsGrid !== false && coupons.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex items-end justify-between border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-widest">
                <Tag className="w-3.5 h-3.5" />
                <span>ACTIVE STORE VOUCHERS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">
                Apply Coupons At Checkout
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div
                key={c._id || c.code}
                className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-md transition-shadow flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 font-mono font-black text-xs border border-amber-200">
                    <span>{c.code}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium truncate">
                    {c.text || c.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(c.code)}
                  className="px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copiedCode === c.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 opacity-80" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. MOSMAC Select Spotlight Section ("isme 1 sec mosmac select ka add kr dena") */}
      {visibility.mosmacSelect !== false && mosmacSelectProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#fbf2ed] via-[#faece7] to-[#f7ded4] text-gray-900 shadow-sm border border-rose-200/70 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-widest">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>{config.mosmacSelectSpotlight?.title || 'Curated by MOSMAC Select'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-gray-950 tracking-tight">
                Luxury Signature Formulations
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {config.mosmacSelectSpotlight?.subtitle ||
                  "Handpicked by our beauty directors for clinical excellence and professional artistry."}
              </p>
            </div>

            <Link
              to="/mosmac-select"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all shrink-0"
            >
              <span>Explore Select Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {mosmacSelectProducts.slice(0, 4).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 6. All Offers & Discounted Products Catalog */}
      {visibility.allOffersCatalog !== false && !activeFocusCardId && offersProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-end justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                All Discounted Products
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Showing {offersProducts.length} verified products on sale.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {offersProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default OffersDealsPage;
