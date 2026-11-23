import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Tag, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

// Brand Typography / Logo Stylizer for authentic brand appearance
export function BrandStylizedLogo({ name, logoUrl, dark = false }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`max-h-10 max-w-[85%] object-contain transition-transform group-hover:scale-105 ${
          dark ? 'brightness-110 drop-shadow-sm' : ''
        }`}
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex';
          }
        }}
      />
    );
  }

  const clean = (name || '').trim().toLowerCase();
  const baseTextColor = dark ? 'text-white' : 'text-gray-950';

  if (clean === 'fastrack' || clean === 'fasttrack') {
    return (
      <span className={`font-black italic text-sm tracking-tight ${baseTextColor} group-hover:text-[#E03A30] uppercase`}>
        FASTRACK
      </span>
    );
  }
  if (clean === 'boat') {
    return (
      <span className={`font-extrabold text-base tracking-tighter ${baseTextColor} group-hover:text-red-400`}>
        bo<span className="text-[#E03A30]">At</span>
      </span>
    );
  }
  if (clean === 'titan') {
    return (
      <span className={`font-serif font-bold text-xs tracking-[0.25em] ${baseTextColor} group-hover:text-amber-400 uppercase`}>
        TITAN
      </span>
    );
  }
  if (clean === 'apple') {
    return (
      <span className={`font-semibold text-sm tracking-tight ${baseTextColor}`}>
         Apple
      </span>
    );
  }
  if (clean === 'samsung') {
    return (
      <span className={`font-black text-xs tracking-widest ${dark ? 'text-blue-400' : 'text-blue-900'} uppercase`}>
        SAMSUNG
      </span>
    );
  }
  if (clean === 'sony') {
    return (
      <span className={`font-serif font-black text-xs tracking-[0.3em] ${baseTextColor} uppercase`}>
        SONY
      </span>
    );
  }

  return (
    <span className={`font-bold text-xs ${baseTextColor} group-hover:text-[#E03A30] tracking-tight truncate max-w-[90%]`}>
      {name}
    </span>
  );
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const BRAND_FILTERS = [
  { label: 'All Brands', filterFn: () => true },
  { label: 'Featured Flagships', filterFn: (b) => b.isFeatured || b.isTopBrand },
  { label: 'Curated by MOSMAC', filterFn: (b) => b.isMosmacLoves },
  { label: 'New Arrivals', filterFn: (b) => b.isNewlyAdded },
  { label: 'Indian Originals', filterFn: (b) => b.isHomegrown }
];

export function BrandsMegaMenu({
  isOpen,
  onClose,
  brands = [],
  onMouseEnter,
  onMouseLeave
}) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Brands');
  const [selectedLetter, setSelectedLetter] = useState('ALL');

  // Click outside listener: any click outside menuRef closes the menu immediately
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

  // Filtered brands based on category tab, search query, and alphabet ribbon
  const filteredBrands = useMemo(() => {
    const activeFilterObj = BRAND_FILTERS.find((f) => f.label === activeFilter) || BRAND_FILTERS[0];
    let list = (brands || []).filter(activeFilterObj.filterFn);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
    }

    if (selectedLetter !== 'ALL') {
      list = list.filter((b) => b.name.trim().toUpperCase().startsWith(selectedLetter));
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, activeFilter, searchQuery, selectedLetter]);

  // Set of available letters that actually contain brands
  const availableLetters = useMemo(() => {
    const letters = new Set();
    (brands || []).forEach((b) => {
      const char = b.name.trim().charAt(0).toUpperCase();
      if (/^[A-Z]$/.test(char)) letters.add(char);
    });
    return letters;
  }, [brands]);

  const handleBrandClick = (slug) => {
    onClose();
    navigate(`/brand/${encodeURIComponent(slug)}`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent backdrop (closes menu on outside click) */}
      <div
        className="fixed inset-0 top-16 bg-slate-950/20 backdrop-blur-2xs z-40 animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Main Brands Mega Menu Modal Wrapper - pointer-events-none allows side margins to pass through */}
      <div
        className="absolute inset-x-0 top-16 z-50 pointer-events-none select-none animate-in fade-in slide-in-from-top-1 duration-150"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={menuRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 md:p-8 space-y-6 mt-1.5"
          >
            
            {/* Top Header Bar: Title, Search & Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-wider text-slate-900 uppercase">
                    MOSMAC Brand Hub
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    {brands.length} Verified Partner{brands.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  100% Genuine Certified Official Brand Stores & Authorized Flagships
                </p>
              </div>

              {/* Integrated Search & Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brand name..."
                    className="w-full pl-8 pr-7 py-2 bg-slate-50 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 border border-slate-200/80 transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {BRAND_FILTERS.map((f) => {
                    const isActive = activeFilter === f.label;
                    return (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => {
                          setActiveFilter(f.label);
                          setSelectedLetter('ALL');
                        }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Horizontal A-Z Alphabet Quick Ribbon */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 text-[11px] font-bold border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setSelectedLetter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedLetter === 'ALL'
                    ? 'bg-[#E03A30] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              {ALPHABET.map((char) => {
                const hasBrands = availableLetters.has(char);
                const isSelected = selectedLetter === char;
                return (
                  <button
                    key={char}
                    type="button"
                    disabled={!hasBrands}
                    onClick={() => setSelectedLetter(char)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[#E03A30] text-white'
                        : hasBrands
                        ? 'text-slate-800 hover:bg-slate-100 cursor-pointer'
                        : 'text-slate-300 cursor-default'
                    }`}
                  >
                    {char}
                  </button>
                );
              })}
            </div>

            {/* Main Showcase Grid + Right Brand Assurance Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Brand Cards Grid */}
              <div className="lg:col-span-8">
                {filteredBrands.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredBrands.map((b) => (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => handleBrandClick(b.slug)}
                        className="group text-left bg-white border border-slate-200/80 hover:border-slate-900 hover:shadow-md rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]"
                        title={`View authentic ${b.name} collection`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <BrandStylizedLogo name={b.name} logoUrl={b.logoUrl} />
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                        </div>

                        <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-800 group-hover:text-[#E03A30] truncate">
                            {b.name}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-14 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      {brands.length === 0
                        ? 'No Brand Partners Added Yet'
                        : `No brands match "${searchQuery || activeFilter}"`}
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {brands.length === 0
                        ? 'Brand manufacturers registered in Admin > Brands will appear here with genuine certified badges.'
                        : 'Try searching for another brand name or reset the alphabet filter.'}
                    </p>
                    {selectedLetter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSelectedLetter('ALL')}
                        className="mt-2 text-xs font-semibold text-[#E03A30] hover:underline"
                      >
                        Reset letter filter
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side: MOSMAC Brand Promise & Trust Panel */}
              <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h4 className="text-xs font-extrabold tracking-wider uppercase text-amber-400">
                    The MOSMAC Standard
                  </h4>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <p>
                      <strong className="text-white">100% Genuine Certified:</strong> Direct manufacturer sourcing with authentic packaging.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <p>
                      <strong className="text-white">Full Brand Warranty:</strong> Backed by official brand service centers across India.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <p>
                      <strong className="text-white">7-Day Easy Returns:</strong> No-questions-asked doorstep return & fast refund.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/brands');
                    }}
                    className="w-full py-2.5 px-3 bg-[#E03A30] hover:bg-[#c93229] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Official Brands Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/products');
                    }}
                    className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Browse All Products</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default BrandsMegaMenu;