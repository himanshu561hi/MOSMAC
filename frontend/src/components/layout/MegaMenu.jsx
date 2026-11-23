import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ChevronRight, Tag } from 'lucide-react';

// Fallback high-res themed imagery for beauty categories
const THEME_IMAGES = {
  makeup: '/images/hero/hero-1-foundation.jpg',
  foundation: '/images/hero/hero-1-foundation.jpg',
  face: '/images/hero/hero-2-loose-powder.jpg',
  eyes: '/images/hero/hero-3-eyeshadow-palette.jpg',
  eyeshadow: '/images/hero/hero-3-eyeshadow-palette.jpg',
  eyeliner: '/images/hero/hero-4-eyeliner.jpg',
  lips: '/images/hero/hero-5-lip-balm.jpg',
  lipstick: '/images/hero/hero-5-lip-balm.jpg',
  beauty: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
  default: '/images/hero/hero-1-foundation.jpg'
};

const getCategoryPromoImage = (category) => {
  if (category?.imageUrl && category.imageUrl.startsWith('http')) {
    return category.imageUrl;
  }
  const name = (category?.name || '').toLowerCase();
  const slug = (category?.slug || '').toLowerCase();

  for (const [key, url] of Object.entries(THEME_IMAGES)) {
    if (name.includes(key) || slug.includes(key)) {
      return url;
    }
  }
  return THEME_IMAGES.default;
};

export function MegaMenu({ category, isOpen, onClose, onMouseEnter, onMouseLeave }) {
  const menuRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;

  const children = Array.isArray(category.children) ? category.children : [];
  const promoImage = getCategoryPromoImage(category);

  // Determine subcategory organization
  // Case A: Multi-level subcategories (children have their own children)
  const hasGrandchildren = children.some((c) => Array.isArray(c.children) && c.children.length > 0);

  return (
    <div
      ref={menuRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 w-full bg-white border-b border-gray-200/90 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Subcategory Navigation Columns (Cols 1-8 / 1-9) */}
          <div className="col-span-8 lg:col-span-8 xl:col-span-9">
            {children.length === 0 ? (
              /* Leaf category with curated shopping shortcuts */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Popular Collections
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <Link
                        to={`/products?category=${category.slug}`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 font-medium group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        Explore All {category.name}
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={`/products?category=${category.slug}&featured=true`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        Featured Bestsellers
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={`/products?category=${category.slug}&sortBy=newest`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        New Launches & Arrivals
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={`/products?category=${category.slug}&inStock=true`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        Ready to Ship
                      </Link>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Customer Favorites
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <Link
                        to={`/products?category=${category.slug}&minRating=4`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        4★ & Above Rated
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={`/products?category=${category.slug}&sortBy=discount`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        Top Discounts & Offers
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={`/category/${category.slug}`}
                        onClick={onClose}
                        className="text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        View Entire Catalogue Hub
                      </Link>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Assured Benefits
                  </h4>
                  <div className="bg-emerald-50/60 rounded-xl p-3 space-y-2 border border-emerald-100/60">
                    <p className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> 100% Genuine Certified
                    </p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Sourced directly from verified brands with official manufacturer warranty.
                    </p>
                  </div>
                </div>
              </div>
            ) : hasGrandchildren ? (
              /* Case A: Hierarchical tree with subcategory column heads and child items */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {children.map((subcat) => {
                  const nested = Array.isArray(subcat.children) ? subcat.children : [];
                  return (
                    <div key={subcat._id} className="space-y-2.5">
                      <Link
                        to={`/products?category=${subcat.slug}`}
                        onClick={onClose}
                        className="text-xs font-bold text-gray-900 uppercase tracking-wider hover:text-emerald-600 transition-colors flex items-center justify-between border-b border-gray-100 pb-1.5"
                      >
                        <span>{subcat.name}</span>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      </Link>

                      <ul className="space-y-1.5 text-xs">
                        {nested.map((item) => (
                          <li key={item._id}>
                            <Link
                              to={`/products?category=${item.slug}`}
                              onClick={onClose}
                              className="text-gray-600 hover:text-emerald-600 transition-colors block py-0.5 hover:translate-x-0.5 transform duration-150"
                            >
                              {item.name}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link
                            to={`/products?category=${subcat.slug}`}
                            onClick={onClose}
                            className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold pt-1 block"
                          >
                            All in {subcat.name} →
                          </Link>
                        </li>
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Case B: Flat subcategories organized into neat vertical columns */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    {category.name} Categories & Subcategories
                  </h4>
                  <Link
                    to={`/category/${category.slug}`}
                    onClick={onClose}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    View All {category.name} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {children.map((subcat) => (
                    <Link
                      key={subcat._id}
                      to={`/products?category=${subcat.slug}`}
                      onClick={onClose}
                      className="group p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">
                          {subcat.name}
                        </p>
                        {subcat.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {subcat.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Promotional Category Card on the Right (Cols 9-12 / 10-12) */}
          <div className="col-span-4 lg:col-span-4 xl:col-span-3 border-l border-gray-100 pl-8">
            <div className="group rounded-2xl overflow-hidden border border-gray-200/80 bg-gradient-to-b from-gray-50 to-white shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-[16/10] w-full overflow-hidden bg-gray-100 relative">
                <img
                  src={promoImage}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  <Tag className="w-3 h-3 text-emerald-600" /> Featured
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                  {category.name} Showcase
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {category.description ||
                    `Discover our handpicked collection of certified authentic ${category.name.toLowerCase()} with pan-India express delivery.`}
                </p>

                <Link
                  to={`/category/${category.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-1.5 w-full mt-1 px-4 py-2 bg-gray-900 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Explore Category Hub
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MegaMenu;
