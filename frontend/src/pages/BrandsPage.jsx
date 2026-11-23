import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Layers,
  Award,
  CheckCircle2,
  X,
  Compass,
  Star,
  ExternalLink
} from 'lucide-react';
import { storefrontService } from '@/services/storefrontService';
import { BrandStylizedLogo } from '@/components/layout/BrandsMegaMenu';
import { SeoHead } from '@/components/common/SeoHead';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeLetter, setActiveLetter] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [brandList, catList] = await Promise.all([
          storefrontService.getBrands(),
          storefrontService.getCategories(false)
        ]);
        setBrands(brandList || []);
        setCategories(catList || []);
      } catch (err) {
        console.error('Failed to load brands directory:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered brands based on search, filter tab, and alphabet
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const name = (brand.name || '').toLowerCase();
      const desc = (brand.description || '').toLowerCase();
      const q = search.trim().toLowerCase();

      // Search match
      if (q && !name.includes(q) && !desc.includes(q)) {
        return false;
      }

      // Tab filter
      if (activeTab === 'featured' && !brand.isFeatured && !brand.isTopBrand) return false;
      if (activeTab === 'curated' && !brand.isMosmacLoves) return false;
      if (activeTab === 'homegrown' && !brand.isHomegrown) return false;

      // Letter filter
      if (activeLetter !== 'ALL') {
        const firstLetter = (brand.name || '').trim()[0]?.toUpperCase();
        if (firstLetter !== activeLetter) return false;
      }

      return true;
    });
  }, [brands, search, activeTab, activeLetter]);

  // Group brands alphabetically for the A-Z directory
  const groupedBrands = useMemo(() => {
    const groups = {};
    brands.forEach((brand) => {
      const letter = (brand.name || '').trim()[0]?.toUpperCase() || '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(brand);
    });
    return groups;
  }, [brands]);

  // Available letters that have at least one brand
  const availableLetters = useMemo(() => {
    const set = new Set();
    brands.forEach((b) => {
      const letter = (b.name || '').trim()[0]?.toUpperCase();
      if (letter) set.add(letter);
    });
    return set;
  }, [brands]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <SeoHead
        title="Official Brands & Flagship Houses | MOSMAC"
        description="Explore 100% genuine verified collections from iconic global brands and homegrown designers. Shop official flagships with direct brand warranties."
        canonicalUrl="/brands"
      />

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link to="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-gray-900">Brands</span>
        </nav>
      </div>

      {/* Hero Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 mb-8">
        <div className="relative rounded-3xl overflow-hidden bg-[#0A0D14] border border-neutral-800 text-white p-8 sm:p-12 shadow-2xl">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(224,58,48,0.25)_0,rgba(124,58,237,0.15)_50%,transparent_70%)] blur-2xl" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-white/10 text-white/90 backdrop-blur-md border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Verified Brand Directory
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-tight">
              Official Brands & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-300">
                Flagship Houses
              </span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed max-w-2xl">
              Shop 100% genuine verified products straight from world-class designers and innovative homegrown brands with manufacturer warranties and door-to-door express delivery.
            </p>

            {/* Trust Points */}
            <div className="pt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-300">
              <div className="flex items-center gap-2 bg-neutral-900/80 px-3.5 py-2 rounded-xl border border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">100% Genuine Certified</span>
              </div>
              <div className="flex items-center gap-2 bg-neutral-900/80 px-3.5 py-2 rounded-xl border border-neutral-800">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Authorized Brand Warranties</span>
              </div>
              <div className="flex items-center gap-2 bg-neutral-900/80 px-3.5 py-2 rounded-xl border border-neutral-800">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span className="font-medium">7-Day Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Controls: Search, Tabs & A-Z Selector */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands by name (e.g. MOSMAC, IMAGIC)..."
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E03A30]/20 focus:border-[#E03A30] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Brands' },
                { id: 'featured', label: 'Flagship Brands' },
                { id: 'curated', label: 'MOSMAC Loves' },
                { id: 'homegrown', label: 'Homegrown' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200/70 text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alphabet Bar */}
          <div className="pt-3 border-t border-gray-100 flex items-center gap-1 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">
              Index:
            </span>
            <button
              type="button"
              onClick={() => setActiveLetter('ALL')}
              className={`w-8 h-7 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                activeLetter === 'ALL'
                  ? 'bg-[#E03A30] text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {ALPHABET.map((letter) => {
              const hasBrands = availableLetters.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasBrands}
                  onClick={() => setActiveLetter(letter)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    activeLetter === letter
                      ? 'bg-[#E03A30] text-white shadow-2xs font-bold'
                      : hasBrands
                      ? 'text-gray-800 hover:bg-gray-100 cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1: Shop By Brand (Flagship Grid) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Shop By Brand</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {filteredBrands.length} Available
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Click any brand to experience its dedicated 3D showcase and full official catalog.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <p className="text-base font-semibold text-gray-800">No brands match your filter criteria.</p>
              <p className="text-xs text-gray-500 mt-1">Try clearing the search or choosing "All".</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveTab('all');
                  setActiveLetter('ALL');
                }}
                className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBrands.map((brand) => (
                <div
                  key={brand._id || brand.slug}
                  onClick={() => navigate(`/brand/${brand.slug}`)}
                  className="group relative bg-white rounded-2xl p-6 border border-gray-200/90 shadow-2xs hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top accent bar */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#E03A30]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    {/* Brand Card Top Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="h-12 w-28 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-2 group-hover:bg-gray-100/80 transition-colors">
                        <BrandStylizedLogo name={brand.name} logoUrl={brand.logoUrl} />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {brand.isTopBrand && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200/60 uppercase tracking-wide">
                            Flagship
                          </span>
                        )}
                        {brand.isMosmacLoves && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-[#E03A30] rounded-md border border-rose-200/60 uppercase tracking-wide">
                            Curated
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Brand Name & Description */}
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-[#E03A30] transition-colors">
                      {brand.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {brand.description || 'Authentic manufacturer flagship with verified quality and direct brand warranty.'}
                    </p>
                  </div>

                  {/* Card Bottom: Action CTA */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">100% Genuine</span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#E03A30] group-hover:translate-x-0.5 transition-transform">
                      Explore Flagship <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Shop By Category (Category to Brand Cross-Hub) */}
        {categories.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#E03A30]" />
                <span>Shop By Category</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Browse our curated categories to discover which premier brands engineer each product class.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.slice(0, 8).map((cat) => (
                <div
                  key={cat.slug}
                  onClick={() => navigate(`/products?category=${cat.slug}`)}
                  className="group bg-white rounded-2xl p-5 border border-gray-200/80 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-[#E03A30] uppercase tracking-wider block mb-1">
                      Department
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#E03A30] transition-colors leading-tight">
                      {cat.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                      {cat.description || 'Explore top brand variants in this category with guaranteed warranty.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500 group-hover:text-gray-900">
                    <span>View Collection</span>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#E03A30] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Alphabetical A-Z Complete Directory */}
        <div className="pt-4 border-t border-gray-200">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              A–Z Complete Brand Directory
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Comprehensive list of all registered manufacturer partners and authorized brand retailers.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.keys(groupedBrands)
                .sort()
                .map((letter) => (
                  <div key={letter} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <span className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-black text-xs flex items-center justify-center">
                        {letter}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">
                        {groupedBrands[letter].length} {groupedBrands[letter].length === 1 ? 'brand' : 'brands'}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {groupedBrands[letter].map((b) => (
                        <li key={b._id || b.slug}>
                          <Link
                            to={`/brand/${b.slug}`}
                            className="inline-flex items-center justify-between w-full group/item text-xs font-semibold text-gray-700 hover:text-[#E03A30] transition-colors py-1 px-1.5 rounded-lg hover:bg-gray-50"
                          >
                            <span>{b.name}</span>
                            <ChevronRight className="w-3 h-3 text-gray-400 group-hover/item:text-[#E03A30] group-hover/item:translate-x-0.5 transition-transform" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandsPage;
