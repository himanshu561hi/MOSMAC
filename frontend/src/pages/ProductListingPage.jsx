import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link, useNavigate } from 'react-router-dom';
import { storefrontService } from '@/services/storefrontService';
import ProductCard from '@/components/product/ProductCard';
import FilterSidebar from '@/components/product/FilterSidebar';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  SlidersHorizontal,
  ChevronRight,
  Package,
  X,
  ChevronLeft,
  ArrowUpDown,
  Home
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { SeoHead } from '@/components/common/SeoHead';
import BrandHeroShowcase from '@/components/brand/BrandHeroShowcase';
import Pagination from '@/components/common/Pagination';

export function ProductListingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug, brandSlug } = useParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 16, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract query parameters
  const currentCategorySlug = categorySlug || searchParams.get('category') || '';
  const currentBrands = brandSlug
    ? [brandSlug]
    : (searchParams.get('brand') ? searchParams.get('brand').split(',').filter(Boolean) : []);
  const currentMinPrice = searchParams.get('minPrice') ? String(parseInt(searchParams.get('minPrice'), 10) / 100) : '';
  const currentMaxPrice = searchParams.get('maxPrice') ? String(parseInt(searchParams.get('maxPrice'), 10) / 100) : '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentSortBy = searchParams.get('sortBy') || 'recommended';
  const currentSortOrder = searchParams.get('sortOrder') || 'desc';
  const currentPage = parseInt(searchParams.get('page'), 10) || 1;
  const searchQuery = searchParams.get('search') || searchParams.get('q') || '';
  const currentSection = searchParams.get('section') || '';
  const isFeaturedFilter = searchParams.get('featured') === 'true';
  const isBestsellerFilter = searchParams.get('bestseller') === 'true' || searchParams.get('bestsellers') === 'true' || searchParams.get('sort') === 'best_selling';
  const isTrendingFilter = searchParams.get('trending') === 'true' || searchParams.get('sort') === 'trending';
  const isDiscountFilter = searchParams.get('discount') === 'true' || currentSection === 'offers_deals';
  const isSelectFilter = searchParams.get('select') === 'true' || currentSection === 'mosmac_select';

  // Dynamic attributes parsed from searchParams (e.g. attrs[ram]=16GB)
  const currentDynamicAttrs = {};
  for (const [key, value] of searchParams.entries()) {
    const match = key.match(/^attrs\[(.*?)\]$/);
    if (match) {
      currentDynamicAttrs[match[1]] = value.split(',').filter(Boolean);
    }
  }

  // Load Categories & Brands metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cats, brs] = await Promise.all([
          storefrontService.getCategories(false),
          storefrontService.getBrands()
        ]);
        setCategories(cats);
        setBrands(brs);
      } catch (err) {
        console.error('Failed to load catalogue metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Redirect dedicated sections to their bespoke experience pages
  useEffect(() => {
    if (currentSection === 'mosmac_select') {
      navigate('/mosmac-select', { replace: true });
    } else if (currentSection === 'offers_deals') {
      navigate('/offers', { replace: true });
    }
  }, [currentSection, navigate]);

  // Fetch filtered products
  useEffect(() => {
    async function fetchCatalogue() {
      setIsLoading(true);
      setError('');
      try {
        const params = {
          page: currentPage,
          limit: 16,
          sortBy: currentSortBy,
          sortOrder: currentSortOrder
        };

        if (currentCategorySlug) params.category = currentCategorySlug;
        if (currentBrands.length > 0) params.brand = currentBrands.join(',');
        if (currentMinPrice) params.minPrice = Math.round(parseFloat(currentMinPrice) * 100);
        if (currentMaxPrice) params.maxPrice = Math.round(parseFloat(currentMaxPrice) * 100);
        if (currentInStock) params.inStock = 'true';
        if (currentMinRating) params.minRating = currentMinRating;
        if (searchQuery) params.search = searchQuery;
        if (currentSection) params.section = currentSection;
        if (isFeaturedFilter) params.featured = 'true';
        if (isBestsellerFilter) params.bestseller = 'true';
        if (isTrendingFilter) params.trending = 'true';
        if (isDiscountFilter) params.discount = 'true';
        if (isSelectFilter) params.select = 'true';

        // Dynamic attribute map
        if (Object.keys(currentDynamicAttrs).length > 0) {
          params.attrs = {};
          for (const [code, vals] of Object.entries(currentDynamicAttrs)) {
            if (vals.length > 0) {
              params.attrs[code] = vals.join(',');
            }
          }
        }

        const res = await storefrontService.getProducts(params);
        setProducts(res.products);
        setPagination(res.pagination);
      } catch (err) {
        setError(err.message || 'Failed to fetch products');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCatalogue();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    currentCategorySlug,
    searchParams.toString(),
    categorySlug,
    currentPage,
    currentSortBy,
    currentSortOrder
  ]);

  // Update query params helper
  const updateQueryParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      newParams.delete(key);
    } else if (Array.isArray(value)) {
      newParams.set(key, value.join(','));
    } else {
      newParams.set(key, String(value));
    }
    if (key !== 'page') {
      newParams.set('page', '1'); // Reset to page 1 only on filter modification, NOT on page change
    }
    setSearchParams(newParams);
  };

  const handleCategorySelect = (cat) => {
    const newParams = new URLSearchParams(searchParams);
    if (cat?.slug) {
      newParams.set('category', cat.slug);
    } else {
      newParams.delete('category');
    }
    // Clear dynamic attributes when switching categories
    for (const key of Array.from(newParams.keys())) {
      if (key.startsWith('attrs[')) {
        newParams.delete(key);
      }
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleBrandToggle = (brandSlug) => {
    const nextBrands = currentBrands.includes(brandSlug)
      ? currentBrands.filter((b) => b !== brandSlug)
      : [...currentBrands, brandSlug];
    updateQueryParam('brand', nextBrands);
  };

  const handlePriceChange = (field, val) => {
    const newParams = new URLSearchParams(searchParams);
    if (field === 'min') {
      if (val) newParams.set('minPrice', String(Math.round(parseFloat(val) * 100)));
      else newParams.delete('minPrice');
    } else if (field === 'max') {
      if (val) newParams.set('maxPrice', String(Math.round(parseFloat(val) * 100)));
      else newParams.delete('maxPrice');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleDynamicAttributeToggle = (code, val) => {
    const current = currentDynamicAttrs[code] || [];
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];

    const newParams = new URLSearchParams(searchParams);
    const key = `attrs[${code}]`;
    if (next.length > 0) {
      newParams.set(key, next.join(','));
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('search', searchQuery);
    setSearchParams(newParams);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);

    if (val === 'price-asc') {
      newParams.set('sortBy', 'price');
      newParams.set('sortOrder', 'asc');
    } else if (val === 'price-desc') {
      newParams.set('sortBy', 'price');
      newParams.set('sortOrder', 'desc');
    } else if (val === 'rating') {
      newParams.set('sortBy', 'rating');
      newParams.set('sortOrder', 'desc');
    } else if (val === 'newest') {
      newParams.set('sortBy', 'newest');
      newParams.set('sortOrder', 'desc');
    } else if (val === 'discount') {
      newParams.set('sortBy', 'discount');
      newParams.set('sortOrder', 'desc');
    } else {
      newParams.set('sortBy', 'recommended');
      newParams.set('sortOrder', 'desc');
    }
    setSearchParams(newParams);
  };

  const selectedCategoryObj = categories.find((c) => c.slug === currentCategorySlug) || null;

  // Active filter count calculation
  let activeFilterCount = 0;
  if (!categorySlug && selectedCategoryObj) activeFilterCount++;
  activeFilterCount += currentBrands.length;
  if (currentMinPrice) activeFilterCount++;
  if (currentMaxPrice) activeFilterCount++;
  if (currentInStock) activeFilterCount++;
  if (currentMinRating) activeFilterCount++;
  activeFilterCount += Object.values(currentDynamicAttrs).reduce((acc, arr) => acc + arr.length, 0);

  const pageTitle = (() => {
    if (selectedCategoryObj) return selectedCategoryObj.name;
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (currentBrands.length === 1) {
      return brands.find((b) => b.slug === currentBrands[0] || b._id === currentBrands[0])?.name || currentBrands[0];
    }
    if (currentSection === 'bestsellers' || isBestsellerFilter) return 'Bestselling Icons';
    if (currentSection === 'trending' || isTrendingFilter) return 'Trending Right Now';
    if (currentSection === 'featured' || isFeaturedFilter) return 'Featured Collection';
    if (currentSection === 'most_loved') return 'Most Loved & Top Rated';
    if (currentSection === 'whats_new') return "What's New & Fresh Drops";
    if (currentSection === 'offers_deals' || isDiscountFilter) return 'Offers & Exclusive Deals';
    if (currentSection === 'mosmac_select' || isSelectFilter) return 'MOSMAC Select';
    if (currentSection) return currentSection.replace(/_/g, ' ');
    return 'All Products';
  })();

  const pageDescription = (() => {
    if (selectedCategoryObj?.description) return selectedCategoryObj.description;
    if (currentBrands.length === 1) {
      const bName = brands.find((b) => b.slug === currentBrands[0] || b._id === currentBrands[0])?.name || currentBrands[0];
      return `Explore the latest authentic collection from ${bName} with 100% genuine warranty and express delivery.`;
    }
    if (currentSection === 'bestsellers' || isBestsellerFilter) {
      return 'Our most-purchased, highly reviewed formulas that never disappoint.';
    }
    if (currentSection === 'trending' || isTrendingFilter) {
      return 'Handpicked beauty essentials trending across India this week.';
    }
    if (currentSection === 'featured' || isFeaturedFilter) {
      return 'Handcrafted formulas, dermatologically tested and certified genuine.';
    }
    if (currentSection === 'most_loved') {
      return 'Customer favorites backed by genuine, verified 5-star reviews.';
    }
    if (currentSection === 'offers_deals' || isDiscountFilter) {
      return 'Premium beauty and cosmetic essentials at special discounted prices.';
    }
    if (currentSection === 'mosmac_select' || isSelectFilter) {
      return 'Handpicked signature selections and certified luxury cosmetic picks.';
    }
    return 'Discover verified quality items with fast pan-India delivery and easy returns.';
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SeoHead
        title={
          searchQuery
            ? `Search: "${searchQuery}" | Mosmac`
            : `${pageTitle} | Mosmac`
        }
        description={pageDescription}
        canonicalUrl={categorySlug ? `/category/${categorySlug}` : '/products'}
        robots={searchQuery || activeFilterCount > 0 ? 'noindex, follow' : 'index, follow'}
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-900 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" /> Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-gray-900">
          Products
        </Link>
        {selectedCategoryObj && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-900">{selectedCategoryObj.name}</span>
          </>
        )}
        {searchQuery && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-900">Search: "{searchQuery}"</span>
          </>
        )}
        {!selectedCategoryObj && !searchQuery && currentBrands.length === 1 && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/brands" className="hover:text-gray-900">
              Brands
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-900 capitalize">
              {brands.find((b) => b.slug === currentBrands[0] || b._id === currentBrands[0])?.name || currentBrands[0]}
            </span>
          </>
        )}
        {!selectedCategoryObj && !searchQuery && currentBrands.length === 0 && (currentSection || isBestsellerFilter || isTrendingFilter || isFeaturedFilter || isDiscountFilter || isSelectFilter) && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-900 capitalize">
              {currentSection === 'bestsellers' || isBestsellerFilter
                ? 'Bestsellers'
                : currentSection === 'trending' || isTrendingFilter
                ? 'Trending Now'
                : currentSection === 'featured' || isFeaturedFilter
                ? 'Featured'
                : currentSection === 'most_loved'
                ? 'Most Loved'
                : currentSection === 'whats_new'
                ? "What's New"
                : currentSection === 'offers_deals' || isDiscountFilter
                ? 'Offers & Deals'
                : currentSection === 'mosmac_select' || isSelectFilter
                ? 'MOSMAC Select'
                : currentSection.replace(/_/g, ' ')}
            </span>
          </>
        )}
      </nav>

      {/* Brand Hero Showcase with 3D Infinite Spiral */}
      {!searchQuery && currentBrands.length === 1 && (
        <BrandHeroShowcase
          brand={
            brands.find((b) => b.slug === currentBrands[0] || b._id === currentBrands[0]) || {
              name: currentBrands[0],
              slug: currentBrands[0]
            }
          }
          products={products}
          categories={categories}
          selectedCategory={currentCategorySlug}
          onSelectCategory={(catSlug) => {
            const nextParams = new URLSearchParams(searchParams);
            if (catSlug) {
              nextParams.set('category', catSlug);
            } else {
              nextParams.delete('category');
            }
            nextParams.set('page', '1');
            setSearchParams(nextParams);
          }}
        />
      )}

      {/* Category / Brand / Section Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight capitalize">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {pageDescription}
          </p>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium hidden sm:inline">Sort:</span>
            <select
              value={
                currentSortBy === 'price'
                  ? currentSortOrder === 'asc'
                    ? 'price-asc'
                    : 'price-desc'
                  : currentSortBy
              }
              onChange={handleSortChange}
              className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold text-gray-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Customer Rating</option>
              <option value="discount">Highest Discount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applied Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-gray-400 font-medium">Applied:</span>

          {!categorySlug && selectedCategoryObj && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              Category: {selectedCategoryObj.name}
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className="hover:text-emerald-950"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {currentBrands.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 font-medium"
            >
              Brand: {b}
              <button type="button" onClick={() => handleBrandToggle(b)} className="hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          {currentMinPrice && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
              Min ₹{currentMinPrice}
              <button
                type="button"
                onClick={() => handlePriceChange('min', '')}
                className="hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {currentMaxPrice && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
              Max ₹{currentMaxPrice}
              <button
                type="button"
                onClick={() => handlePriceChange('max', '')}
                className="hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {currentInStock && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              In Stock Only
              <button
                type="button"
                onClick={() => updateQueryParam('inStock', '')}
                className="hover:text-emerald-950"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {currentMinRating && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-medium">
              {currentMinRating}+ Stars
              <button
                type="button"
                onClick={() => updateQueryParam('minRating', '')}
                className="hover:text-amber-950"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {Object.entries(currentDynamicAttrs).map(([code, vals]) =>
            vals.map((val) => (
              <span
                key={`${code}-${val}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium"
              >
                {code}: {val}
                <button
                  type="button"
                  onClick={() => handleDynamicAttributeToggle(code, val)}
                  className="hover:text-blue-950"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Grid: Sidebar + Product Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Filter Sidebar (Sticky on Scroll) */}
        <div className="hidden lg:block lg:col-span-1 sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-2 scrollbar-none">
          <FilterSidebar
            categories={categories}
            brands={brands}
            selectedCategory={selectedCategoryObj}
            showCategoryFilter={true}
            onCategorySelect={handleCategorySelect}
            selectedBrands={currentBrands}
            onBrandToggle={handleBrandToggle}
            priceRange={{ min: currentMinPrice, max: currentMaxPrice }}
            onPriceChange={handlePriceChange}
            inStockOnly={currentInStock}
            onInStockToggle={(checked) => updateQueryParam('inStock', checked ? 'true' : '')}
            minRating={currentMinRating}
            onMinRatingSelect={(rating) => updateQueryParam('minRating', rating)}
            dynamicAttributes={currentDynamicAttrs}
            onDynamicAttributeToggle={handleDynamicAttributeToggle}
            onResetFilters={handleResetFilters}
            totalResults={pagination.total}
          />
        </div>

        {/* Product Cards Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="text-xs text-gray-500 font-medium">
            Showing <strong className="text-gray-900">{products.length}</strong> of{' '}
            <strong className="text-gray-900">{pagination.total}</strong> products
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-xs text-gray-400">Loading catalogue results...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
              <Package className="w-16 h-16 text-gray-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">No products found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  We couldn't find any products matching your current filters. Try relaxing or resetting your filters.
                </p>
              </div>
              <Button variant="secondary" onClick={handleResetFilters}>
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
              <div>
                Showing Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
                <strong className="text-gray-900">{pagination.totalPages}</strong> ({pagination.total} products)
              </div>

              <Pagination
                totalPages={pagination.totalPages}
                value={currentPage}
                onChange={(newPage) => updateQueryParam('page', newPage)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white p-5 overflow-y-auto">
              <FilterSidebar
                categories={categories}
                brands={brands}
                selectedCategory={selectedCategoryObj}
                showCategoryFilter={true}
                onCategorySelect={handleCategorySelect}
                selectedBrands={currentBrands}
                onBrandToggle={handleBrandToggle}
                priceRange={{ min: currentMinPrice, max: currentMaxPrice }}
                onPriceChange={handlePriceChange}
                inStockOnly={currentInStock}
                onInStockToggle={(checked) => updateQueryParam('inStock', checked ? 'true' : '')}
                minRating={currentMinRating}
                onMinRatingSelect={(rating) => updateQueryParam('minRating', rating)}
                dynamicAttributes={currentDynamicAttrs}
                onDynamicAttributeToggle={handleDynamicAttributeToggle}
                onResetFilters={handleResetFilters}
                totalResults={pagination.total}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setMobileFilterOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductListingPage;
