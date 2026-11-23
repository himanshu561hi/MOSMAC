import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Home,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { SeoHead, buildFaqSchema } from '../components/common/SeoHead';

const HARDCODED_FAQS = {
  'Orders & Tracking': [
    {
      _id: 'faq-1',
      question: 'How do I track my order?',
      answer: 'You can track your shipment status in real-time by visiting our "Track Order" page using your Order ID and registered phone number/email, or directly from your Account Dashboard under My Orders.'
    },
    {
      _id: 'faq-2',
      question: 'Can I cancel my order after placing it?',
      answer: 'Yes, orders can be cancelled anytime before dispatch directly from your Account Orders page. Once dispatched, you can initiate a hassle-free return or refuse delivery upon arrival.'
    },
    {
      _id: 'faq-3',
      question: 'How do I know if my order is confirmed?',
      answer: 'As soon as your payment is processed, you will receive an immediate confirmation email and SMS containing your unique 8-character Order ID and comprehensive invoice breakdown.'
    }
  ],
  'Shipping & Delivery': [
    {
      _id: 'faq-4',
      question: 'How fast do you deliver across India?',
      answer: 'We dispatch all confirmed orders via air express for metro locations (1 to 3 business days) and surface express for non-metro areas (3 to 5 business days).'
    },
    {
      _id: 'faq-5',
      question: 'What are the delivery charges?',
      answer: 'Express shipping is 100% FREE on all orders of ₹999 or above. For orders under ₹999, a flat nominal delivery fee of ₹70 is applied at checkout.'
    },
    {
      _id: 'faq-6',
      question: 'Do you deliver to my pincode?',
      answer: 'We cover over 19,000+ pincodes across all Indian states and Union Territories via premier logistics partners including Blue Dart, Delhivery, and Xpressbees.'
    }
  ],
  'Payments & COD': [
    {
      _id: 'faq-7',
      question: 'Which payment methods do you accept?',
      answer: 'We accept all major UPI apps (Google Pay, PhonePe, Paytm, CRED), Credit/Debit cards (Visa, Mastercard, RuPay, Amex), Net Banking across 50+ banks, and Cash on Delivery (COD) on eligible items.'
    },
    {
      _id: 'faq-8',
      question: 'Is online payment secure on MOSMAC?',
      answer: 'Yes, 100%. All online transactions are protected with bank-grade 256-bit SSL encryption and processed through RBI-approved, PCI-DSS Level 1 certified payment gateways.'
    },
    {
      _id: 'faq-9',
      question: 'When will I receive my refund for a returned order?',
      answer: 'Prepaid refunds are initiated immediately upon warehouse quality check and typically reflect in your source account within 3-5 business days. COD refunds are paid directly via UPI or NEFT.'
    }
  ],
  'Returns & Warranty': [
    {
      _id: 'faq-10',
      question: 'What is MOSMAC’s return and replacement policy?',
      answer: 'We provide a 7-day doorstep replacement and return window for any defective, damaged in transit, or incorrectly delivered products. You can raise a request with photos via your Orders page.'
    },
    {
      _id: 'faq-11',
      question: 'Do products come with manufacturer warranty?',
      answer: 'Yes, all products sold on MOSMAC come with 100% genuine official manufacturer warranty (typically 1 to 2 years depending on the brand and model) redeemable at any brand authorized service center nationwide.'
    }
  ],
  'Authenticity Guarantee': [
    {
      _id: 'faq-12',
      question: 'Are all products 100% original and authentic?',
      answer: 'Guaranteed. MOSMAC partners directly with authorized brand manufacturers and certified flagship beauty suppliers. Every product is 100% authentic, dermatologically tested, sealed in manufacturer retail packaging, and shipped with GST invoices.'
    }
  ]
};

export function FaqPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({});

  const categories = Object.keys(HARDCODED_FAQS);

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredCategories = categories.filter((cat) => {
    if (activeCategory !== 'all' && cat !== activeCategory) return false;
    return true;
  });

  const allFaqsList = Object.values(HARDCODED_FAQS).flat();
  const searchResults = searchQuery.trim()
    ? allFaqsList.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <SeoHead
        title="Frequently Asked Questions (FAQ) | MOSMAC Support"
        description="Find instant answers to questions regarding order tracking, shipping speeds, returns, warranties, and payment methods on MOSMAC."
        canonicalUrl="/faqs"
        jsonLd={buildFaqSchema(allFaqsList)}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium">Customer Support & FAQs</span>
      </nav>

      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <HelpCircle className="w-4 h-4" />
          Self-Service Help Center
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          How can we help you?
        </h1>
        <p className="text-sm text-gray-500 max-w-lg mx-auto">
          Quick, verified answers to common questions about orders, express shipping, warranty claims, and returns.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto pt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by keyword (e.g., tracking, refund, warranty)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      {!searchQuery && (
        <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeCategory === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Questions ({allFaqsList.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeCategory === category
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="space-y-6">
        {searchResults ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Search Results ({searchResults.length})
            </h3>
            {searchResults.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <HelpCircle className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm text-gray-600 font-medium">No answers match your query</p>
                <p className="text-xs text-gray-400">
                  Try searching with different terms or reach out directly to our support team.
                </p>
              </div>
            ) : (
              searchResults.map((faq) => (
                <div
                  key={faq._id}
                  className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(faq._id)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {openItems[faq._id] ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {openItems[faq._id] && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          filteredCategories.map((category) => {
            const rawFaqs = HARDCODED_FAQS[category] || [];
            if (rawFaqs.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {category}
                </h3>

                <div className="space-y-2.5">
                  {rawFaqs.map((faq) => (
                    <div
                      key={faq._id}
                      className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(faq._id)}
                        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <span>{faq.question}</span>
                        {openItems[faq._id] ? (
                          <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                      </button>
                      {openItems[faq._id] && (
                        <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/40">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Still need help footer box */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Still have questions?
          </h4>
          <p className="text-xs text-slate-300">
            Our customer care specialists are available Mon–Sat from 9:00 AM to 8:00 PM IST.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/contact"
            className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-2xs"
          >
            Contact Support
          </Link>
          <Link
            to="/track-order"
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700"
          >
            Track My Order
          </Link>
        </div>
      </div>
    </div>
  );
}

export default FaqPage;
