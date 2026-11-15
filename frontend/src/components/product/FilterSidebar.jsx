import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, SlidersHorizontal, RotateCcw, Check, Star } from 'lucide-react';
import { storefrontService } from '@/services/storefrontService';
import Button from '@/components/common/Button';

export function FilterSidebar({
  categories = [],
  brands = [],
  selectedCategory,
  onCategorySelect,
  selectedBrands = [],
  onBrandToggle,
  priceRange = { min: '', max: '' },
  onPriceChange,
  inStockOnly = false,
  onInStockToggle,
  minRating = '',
  onMinRatingSelect,
  dynamicAttributes = {}, // { [code]: ['val1', 'val2'] }
  onDynamicAttributeToggle,
  onResetFilters,
  totalResults = 0,
  className = '',
  isMobileDrawer = false,
  onCloseMobileDrawer
}) {
  const [categoryAttrs, setCategoryAttrs] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});

  // Fetch dynamic attributes when selectedCategory changes
  useEffect(() => {
    if (!selectedCategory?._id) {
      setCategoryAttrs([]);
      return;
    }

    async function loadAttrs() {
      try {
        const attrs = await storefrontService.getCategoryAttributes(selectedCategory._id);
        // Only keep filterable attributes with options
        const filterable = attrs.filter(
          (a) => a.isFilterable && ['select', 'multiselect'].includes(a.type) && a.options?.length > 0
        );
        setCategoryAttrs(filterable);
      } catch (err) {
        console.error('Failed to load category attributes:', err);
      }
    }

    loadAttrs();
  }, [selectedCategory]);

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    selectedBrands.length > 0 ||
    Boolean(priceRange.min) ||
    Boolean(priceRange.max) ||
    inStockOnly ||
    Boolean(minRating) ||
    Object.values(dynamicAttributes).some((arr) => arr && arr.length > 0);

  return (
    <aside
      className={`bg-white rounded-2xl border border-gray-100 p-5 space-y-6 ${className}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-gray-900 text-sm tracking-tight">Filters</h3>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear All
            </button>
          )}

          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Category Navigation Filter */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-900"
        >
          <span>Categories</span>
          {collapsedSections.categories ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {!collapsedSections.categories && (
          <div className="space-y-1 pt-1 max-h-56 overflow-y-auto text-xs">
            <button
              type="button"
              onClick={() => onCategorySelect(null)}
              className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors flex items-center justify-between ${
                !selectedCategory ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>All Categories</span>
              {!selectedCategory && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory?.slug === cat.slug;
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => onCategorySelect(cat)}
                  className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Brand Filters */}
      {brands.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => toggleSection('brands')}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-900"
          >
            <span>Brands</span>
            {collapsedSections.brands ? (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {!collapsedSections.brands && (
            <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
              {brands.map((brand) => {
                const checked = selectedBrands.includes(brand.slug);
                return (
                  <label
                    key={brand._id}
                    className="flex items-center gap-2.5 py-1 px-1 text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onBrandToggle(brand.slug)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="truncate font-medium">{brand.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Price Filter (₹) */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-900"
        >
          <span>Price (₹)</span>
          {collapsedSections.price ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {!collapsedSections.price && (
          <div className="pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 uppercase">Min Price</label>
                <div className="relative mt-0.5">
                  <span className="absolute left-2.5 top-1.5 text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={priceRange.min}
                    onChange={(e) => onPriceChange('min', e.target.value)}
                    placeholder="0"
                    className="w-full pl-6 pr-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase">Max Price</label>
                <div className="relative mt-0.5">
                  <span className="absolute left-2.5 top-1.5 text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={priceRange.max}
                    onChange={(e) => onPriceChange('max', e.target.value)}
                    placeholder="99999"
                    className="w-full pl-6 pr-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Dynamic Category Attribute Filters */}
      {categoryAttrs.map((attr) => (
        <div key={attr.code} className="space-y-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => toggleSection(attr.code)}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-900"
          >
            <span>
              {attr.name} {attr.unit && <span className="font-normal text-gray-400">({attr.unit})</span>}
            </span>
            {collapsedSections[attr.code] ? (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {!collapsedSections[attr.code] && (
            <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
              {attr.options?.map((optionVal, idx) => {
                const currentVals = dynamicAttributes[attr.code] || [];
                const checked = currentVals.includes(optionVal);

                return (
                  <label
                    key={idx}
                    className="flex items-center gap-2.5 py-1 px-1 text-xs text-gray-700 hover:text-gray-900 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onDynamicAttributeToggle(attr.code, optionVal)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="truncate">{optionVal}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* 5. Availability & Rating */}
      <div className="space-y-3 pt-2 border-t border-gray-100 text-xs">
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer text-gray-800 font-semibold select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => onInStockToggle(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            In Stock Items Only
          </label>
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Customer Rating
          </label>
          <div className="flex flex-col gap-1">
            {[4, 3, 2].map((stars) => {
              const active = minRating === String(stars);
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => onMinRatingSelect(active ? '' : String(stars))}
                  className={`flex items-center gap-1.5 py-1 px-2 rounded-lg text-left transition-colors ${
                    active ? 'bg-amber-50 text-amber-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center">
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    {Array.from({ length: 5 - stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-gray-200" />
                    ))}
                  </span>
                  <span className="text-[11px]">& up</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isMobileDrawer && (
        <div className="pt-4 border-t border-gray-100">
          <Button onClick={onCloseMobileDrawer} className="w-full">
            Apply Filters ({totalResults} results)
          </Button>
        </div>
      )}
    </aside>
  );
}

export default FilterSidebar;

