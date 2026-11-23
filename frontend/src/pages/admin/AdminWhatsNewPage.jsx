import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../../services/cmsService';
import { adminCatalogueService } from '../../features/admin/catalogueService';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Tag,
  Eye,
  EyeOff,
  ShoppingBag,
  Flame,
  Star,
  Check,
  X
} from 'lucide-react';

export function AdminWhatsNewPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Categories & Products catalogue cache
  const [allCategories, setAllCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Config State
  const [config, setConfig] = useState({
    heroBanner: {
      enabled: true,
      badge: 'NEW LAUNCHES & DROPS',
      title: 'THE LUXURY BEAUTY & COSMETICS SCENE',
      subtitle: 'Up to 30% off on newly dropped collections & authorized flagship releases',
      ctaText: 'Shop New Arrivals',
      ctaLink: '/products?sortBy=newest',
      imageUrl: '/images/hero/hero-1-foundation.jpg',
      bgColor: '#FDF1EE'
    },
    newBrands: {
      enabled: true,
      title: 'New Brands On MOSMAC',
      subtitle: 'Recently onboarded premium brands & authorized flagships'
    },
    justDropped: {
      enabled: true,
      title: 'Just Dropped',
      subtitle: 'Fresh arrivals across top categories',
      showCategoryPills: true,
      categoryId: '',
      subcategoryId: '',
      productIds: [],
      limit: 12
    },
    onlyOnMosmac: {
      enabled: true,
      title: 'Only On MOSMAC',
      subtitle: 'Curated products & limited editions available exclusively with us',
      categoryId: '',
      subcategoryId: '',
      productIds: [],
      limit: 10
    },
    trendingNow: {
      enabled: true,
      title: 'Trending Now',
      subtitle: 'Community favorites & high-demand items this week',
      categoryId: '',
      subcategoryId: '',
      productIds: [],
      limit: 8
    }
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [cfgRes, catRes, prodRes] = await Promise.all([
          cmsService.getAdminWhatsNewConfig().catch(() => null),
          adminCatalogueService.getCategories(false).catch(() => []),
          adminCatalogueService.getProducts({ limit: 100 }).catch(() => ({ products: [] }))
        ]);

        if (cfgRes) {
          setConfig((prev) => ({
            heroBanner: { ...prev.heroBanner, ...(cfgRes.heroBanner || {}) },
            newBrands: { ...prev.newBrands, ...(cfgRes.newBrands || {}) },
            justDropped: { ...prev.justDropped, ...(cfgRes.justDropped || {}) },
            onlyOnMosmac: { ...prev.onlyOnMosmac, ...(cfgRes.onlyOnMosmac || {}) },
            trendingNow: { ...prev.trendingNow, ...(cfgRes.trendingNow || {}) }
          }));
        }

        setAllCategories(catRes || []);
        setAllProducts(prodRes?.products || prodRes || []);
      } catch (err) {
        setError(err.message || 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const rootCategories = allCategories.filter((c) => !c.parentId);

  const getSubcategories = (parentId) => {
    if (!parentId) return [];
    return allCategories.filter((c) => String(c.parentId?._id || c.parentId) === String(parentId));
  };

  const getAvailableProducts = (catId, subId) => {
    return allProducts.filter((p) => {
      const pCatId = p.categoryId?._id || p.categoryId;
      if (subId) return String(pCatId) === String(subId);
      if (catId) {
        const subs = getSubcategories(catId).map((s) => String(s._id));
        return String(pCatId) === String(catId) || subs.includes(String(pCatId));
      }
      return true;
    });
  };

  const handleToggleProduct = (sectionKey, productId) => {
    setConfig((prev) => {
      const currentList = prev[sectionKey]?.productIds || [];
      const isSelected = currentList.includes(productId);
      const updatedList = isSelected
        ? currentList.filter((id) => id !== productId)
        : [...currentList, productId];

      return {
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          productIds: updatedList
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await cmsService.updateAdminWhatsNewConfig(config);
      setSuccessMsg('Configuration saved successfully! Public page updated.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading What's New configurator...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back to CMS Hub */}
      <div>
        <Link
          to="/admin/cms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to CMS Hub
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-rose-500" />
              "What's New" Page Manager
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Live Storefront
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Section-wise control: Tick/untick checkboxes to toggle sections, and curate category &rarr; subcategory &rarr; products for each section.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/whats-new"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview /whats-new
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Section 1: Hero Promotional Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="heroBannerEnabled"
              checked={config.heroBanner?.enabled !== false}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  heroBanner: { ...prev.heroBanner, enabled: e.target.checked }
                }))
              }
              className="w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="heroBannerEnabled" className="text-base font-bold text-gray-900 cursor-pointer flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-rose-500" />
              1. Hero Promotional Banner
            </label>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${config.heroBanner?.enabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
            {config.heroBanner?.enabled !== false ? 'Visible on /whats-new' : 'Hidden'}
          </span>
        </div>

        {config.heroBanner?.enabled !== false && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Badge Copy</label>
              <input
                type="text"
                value={config.heroBanner?.badge || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroBanner: { ...prev.heroBanner, badge: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. NEW LAUNCHES & DROPS"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Main Banner Title</label>
              <input
                type="text"
                value={config.heroBanner?.title || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroBanner: { ...prev.heroBanner, title: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. THE TECH & LIFESTYLE SCENE"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subtitle / Offer Description</label>
              <input
                type="text"
                value={config.heroBanner?.subtitle || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroBanner: { ...prev.heroBanner, subtitle: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. Up to 30% off on newly dropped collections"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">CTA Button Text</label>
              <input
                type="text"
                value={config.heroBanner?.ctaText || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroBanner: { ...prev.heroBanner, ctaText: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. Shop New Arrivals"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">CTA Destination Link</label>
              <input
                type="text"
                value={config.heroBanner?.ctaLink || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroBanner: { ...prev.heroBanner, ctaLink: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. /products?sortBy=newest"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Banner Background Image URL</label>
              <input
                type="url"
                value={config.heroBanner?.imageUrl || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroBanner: { ...prev.heroBanner, imageUrl: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="https://..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 2: New Brands On MOSMAC Spotlight */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="newBrandsEnabled"
              checked={config.newBrands?.enabled !== false}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  newBrands: { ...prev.newBrands, enabled: e.target.checked }
                }))
              }
              className="w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="newBrandsEnabled" className="text-base font-bold text-gray-900 cursor-pointer flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" />
              2. "New Brands On MOSMAC" Spotlight Cards
            </label>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${config.newBrands?.enabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
            {config.newBrands?.enabled !== false ? 'Visible on /whats-new' : 'Hidden'}
          </span>
        </div>

        {config.newBrands?.enabled !== false && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Section Title</label>
              <input
                type="text"
                value={config.newBrands?.title || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    newBrands: { ...prev.newBrands, title: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="New Brands On MOSMAC"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={config.newBrands?.subtitle || ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    newBrands: { ...prev.newBrands, subtitle: e.target.value }
                  }))
                }
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Recently onboarded premium brands & authorized flagships"
              />
            </div>
          </div>
        )}
      </div>

      {/* Helper function to render a curated section card with Category -> Subcategory -> Product selection */}
      {[
        {
          key: 'justDropped',
          num: '3',
          defaultTitle: 'Just Dropped',
          icon: ShoppingBag,
          color: 'text-indigo-600',
          badgeText: 'New Arrivals'
        },
        {
          key: 'onlyOnMosmac',
          num: '4',
          defaultTitle: 'Only On MOSMAC',
          icon: Star,
          color: 'text-amber-500',
          badgeText: 'Exclusive'
        },
        {
          key: 'trendingNow',
          num: '5',
          defaultTitle: 'Trending Now',
          icon: Flame,
          color: 'text-red-500',
          badgeText: 'Trending'
        }
      ].map((sec) => {
        const secConfig = config[sec.key] || {};
        const isEnabled = secConfig.enabled !== false;
        const availableSubcats = getSubcategories(secConfig.categoryId);
        const availableProducts = getAvailableProducts(secConfig.categoryId, secConfig.subcategoryId);
        const selectedProductIds = secConfig.productIds || [];

        return (
          <div key={sec.key} className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`${sec.key}Enabled`}
                  checked={isEnabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      [sec.key]: { ...prev[sec.key], enabled: e.target.checked }
                    }))
                  }
                  className="w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor={`${sec.key}Enabled`} className="text-base font-bold text-gray-900 cursor-pointer flex items-center gap-2">
                  <sec.icon className={`w-4 h-4 ${sec.color}`} />
                  {sec.num}. "{secConfig.title || sec.defaultTitle}" Section
                </label>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                {isEnabled ? 'Visible on /whats-new' : 'Hidden'}
              </span>
            </div>

            {isEnabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={secConfig.title || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [sec.key]: { ...prev[sec.key], title: e.target.value }
                        }))
                      }
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder={sec.defaultTitle}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={secConfig.subtitle || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [sec.key]: { ...prev[sec.key], subtitle: e.target.value }
                        }))
                      }
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="Section description..."
                    />
                  </div>
                </div>

                {/* Category -> Subcategory Hierarchy Picker */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Step 1: Select Category & Subcategory
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {availableProducts.length} product(s) available in this selection
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Category
                      </label>
                      <select
                        value={secConfig.categoryId || ''}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            [sec.key]: {
                              ...prev[sec.key],
                              categoryId: e.target.value,
                              subcategoryId: '', // Reset subcategory when category changes
                              productIds: []
                            }
                          }))
                        }
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">All Categories (Auto All Catalogue)</option>
                        {rootCategories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Subcategory <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <select
                        value={secConfig.subcategoryId || ''}
                        disabled={!secConfig.categoryId || availableSubcats.length === 0}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            [sec.key]: {
                              ...prev[sec.key],
                              subcategoryId: e.target.value,
                              productIds: []
                            }
                          }))
                        }
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">
                          {secConfig.categoryId
                            ? 'All Subcategories in this Category'
                            : 'Select a category first'}
                        </option>
                        {availableSubcats.map((sub) => (
                          <option key={sub._id} value={sub._id}>
                            ↳ {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Step 2: Specific Products Selection */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
                        Step 2: Choose Specific Products to Display
                      </span>
                      <span className="text-[11px] font-semibold text-rose-600">
                        {selectedProductIds.length === 0
                          ? 'Showing All Products Auto'
                          : `${selectedProductIds.length} Curated Product(s) Selected`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tick specific products below to curate exact items in this section, or leave unselected to automatically display all matching products.
                    </p>

                    <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 divide-y divide-slate-100">
                      {availableProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No products found in this category/subcategory.
                        </div>
                      ) : (
                        availableProducts.map((prod) => {
                          const isSelected = selectedProductIds.includes(prod._id);
                          return (
                            <label
                              key={prod._id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                                isSelected ? 'bg-rose-50/80 text-rose-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleProduct(sec.key, prod._id)}
                                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer shrink-0"
                                />
                                {prod.images?.[0]?.url && (
                                  <img
                                    src={prod.images[0].url}
                                    alt={prod.title}
                                    className="w-7 h-7 rounded object-cover shrink-0 border border-slate-200"
                                  />
                                )}
                                <span className="truncate">{prod.title}</span>
                              </div>
                              <span className="text-[11px] text-slate-500 shrink-0 font-mono ml-2">
                                ₹{((prod.basePrice || 0) / 100).toLocaleString('en-IN')}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Products Badges */}
                    {selectedProductIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500">Selected:</span>
                        {selectedProductIds.map((id) => {
                          const prod = allProducts.find((p) => p._id === id);
                          if (!prod) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            >
                              {prod.title}
                              <button
                                type="button"
                                onClick={() => handleToggleProduct(sec.key, id)}
                                className="hover:text-rose-950"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              [sec.key]: { ...prev[sec.key], productIds: [] }
                            }))
                          }
                          className="text-[10px] text-slate-400 hover:text-slate-600 underline ml-1"
                        >
                          Clear Selection
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Floating Save Button at bottom */}
      <div className="sticky bottom-6 p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-between text-white border border-slate-800">
        <div className="text-xs">
          <span className="font-bold text-emerald-400">Section Changes Ready:</span> Make sure to save your preferences for them to reflect on <strong>/whats-new</strong>.
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

export default AdminWhatsNewPage;
