import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ArrowRight, Package, Tag, Bookmark } from 'lucide-react';
import { storefrontService } from '@/services/storefrontService';
import { formatCurrency } from '@/utils/formatters';

const RECENT_SEARCHES_KEY = 'aurora_recent_searches';

export function SearchBar({ className = '', onSearchSubmitted }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({ products: [], categories: [], brands: [] });
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions({ products: [], categories: [], brands: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await storefrontService.getSearchSuggestions(query);
        setSuggestions(data);
      } catch (err) {
        console.error('Failed to fetch search suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = (text) => {
    if (!text.trim()) return;
    try {
      const updated = [text.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== text.trim().toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      // Ignore
    }
  };

  const executeSearch = (searchTerm) => {
    const term = (searchTerm || query).trim();
    if (!term) return;

    saveRecentSearch(term);
    setIsOpen(false);
    if (onSearchSubmitted) onSearchSubmitted();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasSuggestions =
    suggestions.products.length > 0 ||
    suggestions.categories.length > 0 ||
    suggestions.brands.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for products, categories, brands..."
          className="w-full pl-10 pr-9 py-2 bg-gray-100 text-sm rounded-full border border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all text-gray-800 placeholder-gray-400"
          autoComplete="off"
        />
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions({ products: [], categories: [], brands: [] });
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 text-sm animate-in fade-in duration-100 divide-y divide-gray-50">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-gray-400 hover:text-red-500 text-[11px] normal-case"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-0.5">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      executeSearch(term);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 rounded-lg group"
                  >
                    <span>{term}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Searching catalogue...
            </div>
          )}

          {/* Live Suggestions Content */}
          {!isLoading && query.length >= 2 && (
            <>
              {!hasSuggestions ? (
                <div className="p-5 text-center text-gray-400 text-xs">
                  No matching results found for "{query}".
                  <button
                    type="button"
                    onClick={() => executeSearch()}
                    className="block mx-auto mt-2 text-emerald-600 font-semibold underline"
                  >
                    Search anyway &rarr;
                  </button>
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {/* Matching Categories */}
                  {suggestions.categories.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-600" /> Categories
                      </div>
                      <div className="space-y-0.5">
                        {suggestions.categories.map((cat) => (
                          <button
                            key={cat.slug}
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/products?category=${cat.slug}`);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg flex items-center justify-between"
                          >
                            <span>in <strong className="font-semibold">{cat.name}</strong></span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Brands */}
                  {suggestions.brands.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-emerald-600" /> Brands
                      </div>
                      <div className="space-y-0.5">
                        {suggestions.brands.map((brand) => (
                          <button
                            key={brand.slug}
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/products?brand=${brand.slug}`);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg flex items-center justify-between"
                          >
                            <span>by <strong className="font-semibold">{brand.name}</strong></span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Products */}
                  {suggestions.products.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1">
                        <Package className="w-3 h-3 text-emerald-600" /> Products
                      </div>
                      <div className="space-y-1">
                        {suggestions.products.map((prod) => {
                          const img = prod.images?.[0]?.url;
                          return (
                            <button
                              key={prod._id}
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/product/${prod.slug}`);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-800 hover:bg-gray-50 rounded-lg flex items-center gap-3 group"
                            >
                              <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                                {img ? (
                                  <img src={img} alt={prod.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                                  {prod.title}
                                </p>
                                <p className="text-[11px] text-gray-500 font-medium">
                                  {formatCurrency(prod.basePrice)}
                                  {prod.categoryId?.name && (
                                    <span className="text-gray-400 ml-1.5">in {prod.categoryId.name}</span>
                                  )}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => executeSearch()}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                    >
                      View all results for "{query}" &rarr;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;

