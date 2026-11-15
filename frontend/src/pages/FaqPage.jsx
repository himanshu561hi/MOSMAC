import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../services/cmsService';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Home,
  ChevronRight,
  Phone
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { SeoHead, buildFaqSchema } from '../components/common/SeoHead';

export function FaqPage() {
  const [groupedFaqs, setGroupedFaqs] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFaqs() {
      try {
        setLoading(true);
        setError(null);
        const res = await cmsService.getFaqs();
        setGroupedFaqs(res.grouped || {});
      } catch (err) {
        setError(err.message || 'Failed to load FAQs');
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  const categories = Object.keys(groupedFaqs);

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter questions based on activeCategory and searchQuery
  const filteredCategories = categories.filter((cat) => {
    if (activeCategory !== 'all' && cat !== activeCategory) return false;
    return true;
  });

  const allFaqsList = Object.values(groupedFaqs).flat();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <SeoHead
        title="Frequently Asked Questions (FAQ) | Aura"
        description="Find answers to common questions about orders, shipping, payment methods, delivery PIN codes, and 7-day returns."
        canonicalUrl="/faqs"
        jsonLd={allFaqsList.length > 0 ? buildFaqSchema(allFaqsList) : null}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-800">Frequently Asked Questions</span>
      </nav>

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-full mb-1">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          How can we help you?
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
          Find instant answers to common questions about shipping, delivery timelines, payment gateways, and return policies.
        </p>

        {/* Search Bar */}
        <div className="max-w-lg mx-auto pt-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g. tracking, returns, COD)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Questions
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 mt-2">Loading customer questions...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          No FAQs currently published. Please check back shortly or reach out to our customer care.
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category) => {
            const rawFaqs = groupedFaqs[category] || [];
            const matchingFaqs = rawFaqs.filter((f) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
            });

            if (matchingFaqs.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
                  {category}
                </h2>
                <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  {matchingFaqs.map((faq) => {
                    const isOpen = openItems[faq._id];
                    return (
                      <div key={faq._id} className="transition-colors">
                        <button
                          onClick={() => toggleItem(faq._id)}
                          className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-semibold text-gray-900 hover:bg-gray-50 transition"
                        >
                          <span className="text-sm sm:text-base leading-snug">{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50/50">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Support Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-gray-900">Still have questions?</h3>
          <p className="text-sm text-gray-600">
            Can’t find what you’re looking for? Our customer support desk is ready to assist.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="mailto:support@aurora.in"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Support
          </a>
          <a
            href="tel:+919876543210"
            className="inline-flex items-center px-4 py-2 border border-blue-200 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Helpdesk
          </a>
        </div>
      </div>
    </div>
  );
}

export default FaqPage;
