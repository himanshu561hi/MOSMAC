import React, { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

export function OffersRibbonBanner({ offers = [] }) {
  const [copiedCode, setCopiedCode] = useState(null);

  // Default offers if none or alongside active coupons
  const defaultOffers = [
    { text: 'Free Delivery on orders above ₹999', isDefault: true },
    { text: 'Cash on Delivery (COD) available across India', isDefault: true },
    { text: '100% Genuine Certified Luxury Brands', isDefault: true }
  ];

  // Combine active coupons with default offers
  const allItems = [
    ...offers.map((o) => ({
      ...o,
      isCoupon: true
    })),
    ...defaultOffers
  ];

  const handleCopy = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl shadow-xs bg-gradient-to-r from-[#f8aa8e] via-[#f7be9e] to-[#f8aa8e] py-2.5 sm:py-3.5 px-3 sm:px-5 flex items-center border border-white/30 text-white">
        {/* Left Badge: OFFERS FOR YOU | */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-2.5 pl-1 pr-3 sm:pr-4 border-r border-white/40 z-10 select-none">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/95" />
          <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-wider text-white drop-shadow-2xs whitespace-nowrap">
            OFFERS FOR YOU
          </span>
        </div>

        {/* Right Ticker Container */}
        <div className="overflow-hidden relative flex-1 ml-2 sm:ml-4 select-none">
          <div className="flex items-center w-max animate-ribbon-marquee hover:[animation-play-state:paused]">
            {/* Duplicated for smooth infinite ticker */}
            {[...allItems, ...allItems].map((item, index) => (
              <div key={index} className="flex items-center shrink-0">
                <span className="text-xs sm:text-sm font-medium text-white/95 flex items-center gap-1.5 whitespace-nowrap">
                  {item.isCoupon ? (
                    <>
                      <span>Use</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, item.code)}
                        title="Click to copy coupon code"
                        className="font-extrabold text-white underline decoration-white/60 underline-offset-2 hover:text-black hover:decoration-black cursor-pointer transition-colors inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded"
                      >
                        <span>{item.code}</span>
                        {copiedCode === item.code ? (
                          <Check className="w-3 h-3 text-emerald-950 stroke-[3]" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 opacity-70" />
                        )}
                      </button>
                      <span>
                        {item.discountText || (item.text ? item.text.replace(`Use ${item.code}`, '') : '')}
                      </span>
                    </>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </span>
                <span className="mx-3.5 sm:mx-5 text-white/60 font-black text-sm select-none">
                  •
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ribbonMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ribbon-marquee {
          animation: ribbonMarquee 35s linear infinite;
        }
      `}</style>
    </section>
  );
}

export default OffersRibbonBanner;
