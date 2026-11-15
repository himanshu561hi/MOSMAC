import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, Mail, Phone, MapPin, ChevronRight, Home } from 'lucide-react';

export function StaticContentPage({ type = 'about' }) {
  const contentMap = {
    about: {
      title: 'About Our Platform',
      subtitle: 'Building a reliable, customer-first e-commerce experience for India.',
      body: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Welcome to our multi-category e-commerce platform. We are dedicated to providing a seamless, reliable, and premium shopping destination for customers across India.
          </p>
          <p>
            Unlike open marketplaces with mixed quality checks, our inventory is curated, quality-inspected, and backed by authentic brand partnerships. Every product is stored in temperature-controlled fulfilment hubs and dispatched with tamper-evident packaging.
          </p>
          <h3 className="text-base font-bold text-gray-900 pt-2">Our Core Commitments</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li>100% Genuine & Brand-Certified Products with Manufacturer Warranty.</li>
            <li>Express pan-India delivery covering 25,000+ Indian PIN codes.</li>
            <li>Zero-tolerance policy for counterfeit goods or gray-market imports.</li>
            <li>Secure checkout backed by 256-bit SSL encryption and Razorpay PCI-DSS compliance.</li>
          </ul>
        </div>
      )
    },
    shipping: {
      title: 'Shipping & Delivery Policy',
      subtitle: 'Transparent pan-India logistics and delivery timeframes.',
      body: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            We partner with India's leading logistics providers (including BlueDart, Delhivery, and Xpressbees) to ensure reliable delivery across urban and rural PIN codes.
          </p>
          <h3 className="text-base font-bold text-gray-900 pt-2">Shipping Charges</h3>
          <p className="text-xs text-gray-600">
            Standard delivery is completely <strong>FREE on all orders above ₹999.00</strong>. Orders below ₹999.00 incur a flat shipping and handling charge of ₹49.00.
          </p>
          <h3 className="text-base font-bold text-gray-900 pt-2">Estimated Lead Times</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li><strong>Metro Cities (Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad):</strong> 2 to 3 Business Days.</li>
            <li><strong>Tier 2 & Tier 3 Cities:</strong> 3 to 5 Business Days.</li>
            <li><strong>North-East & Special Logistics Zones:</strong> 5 to 7 Business Days.</li>
          </ul>
          <h3 className="text-base font-bold text-gray-900 pt-2">Cash on Delivery (COD)</h3>
          <p className="text-xs text-gray-600">
            Cash on Delivery is available across 95%+ of serviceable PIN codes. Verification via OTP may be requested for high-value orders.
          </p>
        </div>
      )
    },
    returns: {
      title: 'Returns & Refund Policy',
      subtitle: 'Hassle-free 7-day doorstep replacement and refund guarantees.',
      body: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            We want you to love what you buy. If you receive an item that is defective, damaged in transit, or not as described, you may request a return or replacement within <strong>7 days of delivery</strong>.
          </p>
          <h3 className="text-base font-bold text-gray-900 pt-2">Return Eligibility Criteria</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li>Item must be unused, unwashed, and in its original condition with all tags intact.</li>
            <li>Original brand packaging, warranty cards, and accessories must be returned.</li>
            <li>Personal hygiene and intimate apparel items are non-returnable once opened.</li>
          </ul>
          <h3 className="text-base font-bold text-gray-900 pt-2">Refund Processing</h3>
          <p className="text-xs text-gray-600">
            Once the returned product arrives at our inspection warehouse and passes quality validation, refunds are processed within 24 to 48 hours to your original payment method (Razorpay/Bank Account).
          </p>
        </div>
      )
    },
    contact: {
      title: 'Help & Customer Support',
      subtitle: 'We are here to assist you with order inquiries, deliveries, and feedback.',
      body: (
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
              <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-gray-900 text-xs">Email Support</h4>
                <p className="text-xs text-gray-500 mt-1">support@aurora.internal</p>
                <p className="text-[11px] text-gray-400">Response within 4 hours</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
              <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-gray-900 text-xs">Toll-Free Helpline</h4>
                <p className="text-xs text-gray-500 mt-1">1800-123-AURORA</p>
                <p className="text-[11px] text-gray-400">Mon - Sat: 9 AM - 8 PM IST</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-gray-900 text-xs">Headquarters</h4>
                <p className="text-xs text-gray-500 mt-1">Bengaluru, Karnataka</p>
                <p className="text-[11px] text-gray-400">PIN 560001, India</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How we collect, protect, and respect your personal data.',
      body: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Your privacy is of utmost importance to us. This policy details how we collect customer information strictly for fulfilling orders and improving your shopping experience.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li>We do not sell, rent, or trade your personal data to third-party marketing companies.</li>
            <li>Passwords are hashed using cost-factor 12 bcrypt with zero plaintext storage.</li>
            <li>Payment card numbers and CVV codes are never stored on our servers; payments are handled directly by RBI-authorized PCI-DSS certified payment aggregators.</li>
            <li>Customers may request deletion of their account data at any time via support.</li>
          </ul>
        </div>
      )
    },
    terms: {
      title: 'Terms & Conditions',
      subtitle: 'Platform user agreement and standard purchase conditions.',
      body: (
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            By accessing and shopping on our platform, you agree to comply with our standard terms of service, applicable Indian e-commerce consumer protection regulations, and legal guidelines.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
            <li>All prices listed are in Indian Rupees (INR) and include statutory GST taxes.</li>
            <li>Product orders are subject to stock availability and order confirmation.</li>
            <li>Misuse of coupons or fraudulent chargeback attempts will result in immediate account suspension.</li>
          </ul>
        </div>
      )
    }
  };

  const item = contentMap[type] || contentMap.about;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-900 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" /> Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-900">{item.title}</span>
      </nav>

      {/* Header */}
      <div className="border-b border-gray-100 pb-5 space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{item.title}</h1>
        <p className="text-sm text-gray-500">{item.subtitle}</p>
      </div>

      {/* Body Content */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-10 shadow-2xs">
        {item.body}
      </div>
    </div>
  );
}

export default StaticContentPage;

