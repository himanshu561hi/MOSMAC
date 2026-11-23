import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Tag,
  Eye,
  EyeOff,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { offersDealsService } from '@/services/offersDealsService';

export function AdminOffersDealsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);
        const res = await offersDealsService.getConfig();
        setConfig(res);
      } catch (err) {
        console.error('Failed to load Offers & Deals config:', err);
        setError('Failed to load configuration.');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleToggleVisibility = (sectionKey) => {
    setConfig((prev) => ({
      ...prev,
      sectionsVisibility: {
        ...prev.sectionsVisibility,
        [sectionKey]: !prev.sectionsVisibility[sectionKey]
      }
    }));
  };

  const handleCardChange = (index, field, value) => {
    setConfig((prev) => {
      const updatedCards = [...prev.offersInFocus.cards];
      updatedCards[index] = {
        ...updatedCards[index],
        [field]: value
      };
      return {
        ...prev,
        offersInFocus: {
          ...prev.offersInFocus,
          cards: updatedCards
        }
      };
    });
  };

  const handleToggleCardActive = (index) => {
    setConfig((prev) => {
      const updatedCards = [...prev.offersInFocus.cards];
      updatedCards[index] = {
        ...updatedCards[index],
        isActive: !updatedCards[index].isActive
      };
      return {
        ...prev,
        offersInFocus: {
          ...prev.offersInFocus,
          cards: updatedCards
        }
      };
    });
  };

  const handleAddCard = () => {
    setConfig((prev) => ({
      ...prev,
      offersInFocus: {
        ...prev.offersInFocus,
        cards: [
          ...(prev.offersInFocus.cards || []),
          {
            id: `focus-${Date.now()}`,
            label: 'Special',
            discount: '20% Off',
            minDiscount: 20,
            isActive: true,
            order: (prev.offersInFocus.cards?.length || 0) + 1
          }
        ]
      }
    }));
  };

  const handleDeleteCard = (index) => {
    setConfig((prev) => {
      const updatedCards = prev.offersInFocus.cards.filter((_, i) => i !== index);
      return {
        ...prev,
        offersInFocus: {
          ...prev.offersInFocus,
          cards: updatedCards
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const res = await offersDealsService.updateConfig(config);
      setConfig(res);
      setMessage('Offers & Deals settings saved successfully!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-500 font-medium">
        Loading Offers & Deals configuration...
      </div>
    );
  }

  const visibility = config?.sectionsVisibility || {
    dealsOfTheDay: true,
    offersInFocus: true,
    couponsGrid: true,
    mosmacSelect: true,
    allOffersCatalog: true
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Offers & Deals Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
              Storefront Page Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Configure section visibility, Deals of the Day, and "Offers In Focus" cards displayed on the /offers storefront page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/offers"
            target="_blank"
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview Page</span>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Storefront Section Visibility Controls */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Page Section Visibility Controls
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Toggle which components appear on the public Offers & Deals page.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Deals of the Day */}
          <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Deals of the Day</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Countdown timer & flash deals</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVisibility('dealsOfTheDay')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                visibility.dealsOfTheDay
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {visibility.dealsOfTheDay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{visibility.dealsOfTheDay ? 'Visible' : 'Hidden'}</span>
            </button>
          </div>

          {/* Offers In Focus */}
          <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Offers In Focus</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Interactive discount tier cards</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVisibility('offersInFocus')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                visibility.offersInFocus
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {visibility.offersInFocus ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{visibility.offersInFocus ? 'Visible' : 'Hidden'}</span>
            </button>
          </div>

          {/* MOSMAC Select Spotlight */}
          <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h4 className="text-xs font-bold text-gray-900">MOSMAC Select Spotlight</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Luxury curation feature block</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVisibility('mosmacSelect')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                visibility.mosmacSelect
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {visibility.mosmacSelect ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{visibility.mosmacSelect ? 'Visible' : 'Hidden'}</span>
            </button>
          </div>

          {/* Active Coupons Grid */}
          <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Active Coupons Grid</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Voucher cards with 1-click copy</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVisibility('couponsGrid')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                visibility.couponsGrid
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {visibility.couponsGrid ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{visibility.couponsGrid ? 'Visible' : 'Hidden'}</span>
            </button>
          </div>

          {/* All Offers Catalog */}
          <div className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h4 className="text-xs font-bold text-gray-900">All Offers Catalog</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Comprehensive discounted product grid</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVisibility('allOffersCatalog')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                visibility.allOffersCatalog
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {visibility.allOffersCatalog ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{visibility.allOffersCatalog ? 'Visible' : 'Hidden'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Manage "Offers In Focus" Cards (Matching Reference Screenshot) */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              "Offers In Focus" Tier Cards
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              These cards render on the page as large interactive discount blocks. Clicking one filters the showcase below.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddCard}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(config?.offersInFocus?.cards || []).map((card, idx) => (
            <div
              key={card.id || idx}
              className={`p-5 rounded-2xl border transition-all space-y-4 ${
                card.isActive
                  ? 'bg-gradient-to-br from-[#faebe6] to-[#f7ded4] border-rose-200 shadow-xs'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  CARD #{idx + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleCardActive(idx)}
                    title={card.isActive ? 'Active on page' : 'Inactive on page'}
                    className={`p-1.5 rounded-md text-xs font-bold ${
                      card.isActive ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {card.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(idx)}
                    title="Delete card"
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Label (e.g. Flat, Minimum)
                  </label>
                  <input
                    type="text"
                    value={card.label || ''}
                    onChange={(e) => handleCardChange(idx, 'label', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    placeholder="Flat / Minimum"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Discount Heading (e.g. 25% Off)
                  </label>
                  <input
                    type="text"
                    value={card.discount || ''}
                    onChange={(e) => handleCardChange(idx, 'discount', e.target.value)}
                    className="w-full text-xs font-extrabold px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    placeholder="25% Off / 50% Off"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Minimum Discount (%) to Filter
                  </label>
                  <input
                    type="number"
                    value={card.minDiscount ?? 0}
                    onChange={(e) => handleCardChange(idx, 'minDiscount', parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-semibold px-3 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                    placeholder="25"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Mini Preview */}
              <div className="pt-2 border-t border-black/5 text-center">
                <span className="text-[11px] text-gray-500 block">Preview on page:</span>
                <span className="text-xs text-gray-700 font-medium">{card.label || 'Flat'}</span>
                <span className="text-lg font-black text-gray-950 block">{card.discount || '25% Off'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Related Resource Links */}
      <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Related Catalog Resources</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product assignments and coupon discount vouchers across the store.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/admin/homepage-sections"
            className="p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 group-hover:text-black">
                  Manage "Offers & Deals" Products
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Assign & reorder products in the Offers & Deals section
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
          </Link>

          <Link
            to="/admin/coupons"
            className="p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 group-hover:text-black">
                  Manage Coupons & Promos
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Create voucher codes (WEDLOCK, BRIDESHOP, etc.)
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminOffersDealsPage;
