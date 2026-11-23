import React from 'react';
import { ShieldCheck, Truck, Headphones, RotateCcw } from 'lucide-react';

export function TrustPillarsBanner({ className = '' }) {
  const pillars = [
    {
      icon: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-900 border border-black/5">
          <ShieldCheck className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
        </div>
      ),
      title: '100% Authentic',
      description: 'All our products are directly sourced from brands'
    },
    {
      icon: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-900 border border-black/5">
          <Truck className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
        </div>
      ),
      title: 'Free Shipping',
      description: 'On all orders above ₹999'
    },
    {
      icon: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-900 border border-black/5">
          <Headphones className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
        </div>
      ),
      title: 'Certified Beauty Advisors',
      description: 'Get expert consultations'
    },
    {
      icon: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-900 border border-black/5">
          <RotateCcw className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
        </div>
      ),
      title: 'Easy Returns',
      description: 'Hassle-free pick-ups and refunds'
    }
  ];

  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="bg-[#faebe6] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xs border border-white/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {pillars.map((item, idx) => (
            <div key={idx} className="flex flex-col items-start space-y-2.5">
              <div className="shrink-0">{item.icon}</div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                  {item.title}
                </h4>
                <p className="text-xs sm:text-[13px] text-gray-600 mt-0.5 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustPillarsBanner;
