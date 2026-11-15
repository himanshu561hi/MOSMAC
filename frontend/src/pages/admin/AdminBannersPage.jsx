import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { BulkActionButtons } from '../../components/admin/BulkActionButtons';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

export function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'hero', 'promo'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    bannerType: 'hero',
    title: '',
    subtitle: '',
    desktopImageUrl: '',
    mobileImageUrl: '',
    altText: '',
    ctaLabel: '',
    ctaDestination: '',
    displayOrder: 1,
    startDate: '',
    endDate: '',
    isActive: true
  });

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = activeTab !== 'all' ? { type: activeTab } : {};
      const data = await cmsService.listAdminBanners(params);
      setBanners(data);
    } catch (err) {
      setError(err.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [activeTab]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      bannerType: activeTab === 'promo' ? 'promo' : 'hero',
      title: '',
      subtitle: '',
      desktopImageUrl: '',
      mobileImageUrl: '',
      altText: '',
      ctaLabel: '',
      ctaDestination: '',
      displayOrder: banners.length + 1,
      startDate: '',
      endDate: '',
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      bannerType: banner.bannerType,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      desktopImageUrl: banner.desktopImageUrl || '',
      mobileImageUrl: banner.mobileImageUrl || '',
      altText: banner.altText || '',
      ctaLabel: banner.ctaLabel || '',
      ctaDestination: banner.ctaDestination || '',
      displayOrder: banner.displayOrder || 1,
      startDate: banner.startDate ? banner.startDate.slice(0, 10) : '',
      endDate: banner.endDate ? banner.endDate.slice(0, 10) : '',
      isActive: banner.isActive
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        bannerType: formData.bannerType,
        title: formData.title,
        subtitle: formData.subtitle,
        desktopImageUrl: formData.desktopImageUrl,
        mobileImageUrl: formData.mobileImageUrl || formData.desktopImageUrl,
        altText: formData.altText || formData.title,
        ctaLabel: formData.ctaLabel,
        ctaDestination: formData.ctaDestination || '/products',
        displayOrder: Number(formData.displayOrder) || 1,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        isActive: formData.isActive
      };

      if (editingBanner) {
        await cmsService.updateBanner(editingBanner._id, payload);
        setSuccessMsg('Banner updated successfully');
      } else {
        await cmsService.createBanner(payload);
        setSuccessMsg('New banner created');
      }

      setModalOpen(false);
      await loadBanners();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (banner) => {
    try {
      await cmsService.updateBanner(banner._id, { isActive: !banner.isActive });
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, isActive: !b.isActive } : b))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner permanently?')) return;
    try {
      await cmsService.deleteBanner(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
      setSuccessMsg('Banner removed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete banner');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-emerald-600" />
            Hero & Promotional Banners
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Maintain marketing visual assets, schedule seasonal promotions, and target storefront traffic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="banners"
            moduleTitle="Banners"
            onSuccess={loadBanners}
          />
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Banner
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'all', label: 'All Banners' },
          { key: 'hero', label: 'Hero Carousel Banners' },
          { key: 'promo', label: 'Promotional Grid Banners' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2.5 px-4 font-medium text-sm border-b-2 transition -mb-px ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Banners Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="ml-3 text-sm text-gray-500">Loading banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Banners Found</h3>
          <p className="text-sm text-gray-500 mt-1">Get started by creating a hero banner or promotional strip.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div
              key={banner._id}
              className={`bg-white rounded-xl border overflow-hidden shadow-sm flex flex-col justify-between transition ${
                !banner.isActive ? 'border-gray-200 opacity-70' : 'border-gray-200 hover:shadow-md'
              }`}
            >
              {/* Image Preview */}
              <div className="relative aspect-[16/8] bg-gray-100 overflow-hidden">
                {banner.desktopImageUrl ? (
                  <img
                    src={banner.desktopImageUrl}
                    alt={banner.altText || banner.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/800x400?text=Banner+Image+Placeholder';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No image provided
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-sm">
                    {banner.bannerType}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/90 text-gray-800 shadow-sm">
                    Order #{banner.displayOrder}
                  </span>
                </div>
                {!banner.isActive && (
                  <div className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded bg-rose-600 text-white">
                    Inactive
                  </div>
                )}
              </div>

              {/* Banner Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base line-clamp-1">
                    {banner.title || '(Untitled Banner)'}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{banner.subtitle}</p>
                  )}
                  {banner.ctaDestination && (
                    <div className="mt-3 flex items-center text-xs text-emerald-600 font-medium">
                      <span>Destination: <strong>{banner.ctaDestination}</strong></span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </div>
                  )}
                  {(banner.startDate || banner.endDate) && (
                    <div className="mt-2 flex items-center text-[11px] text-gray-400 gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {banner.startDate ? new Date(banner.startDate).toLocaleDateString() : 'Now'} —{' '}
                        {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggle(banner)}
                    className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded transition ${
                      banner.isActive
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {banner.isActive ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                    {banner.isActive ? 'Active' : 'Draft'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition"
                      title="Edit Banner"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(banner._id)}
                      className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingBanner ? 'Edit Banner' : 'Create Banner'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Type *</label>
                  <select
                    value={formData.bannerType}
                    onChange={(e) => setFormData({ ...formData, bannerType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="hero">Hero Carousel Banner</option>
                    <option value="promo">Promotional Banner</option>
                    <option value="sidebar">Sidebar / Strip Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Festival Season Mega Clearance"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Up to 40% Off Handcrafted Lighting"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desktop Image URL *</label>
                <input
                  type="url"
                  required
                  value={formData.desktopImageUrl}
                  onChange={(e) => setFormData({ ...formData, desktopImageUrl: e.target.value })}
                  placeholder="https://res.cloudinary.com/.../hero.jpg"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.mobileImageUrl}
                  onChange={(e) => setFormData({ ...formData, mobileImageUrl: e.target.value })}
                  placeholder="https://res.cloudinary.com/.../hero-mobile.jpg"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Label</label>
                  <input
                    type="text"
                    value={formData.ctaLabel}
                    onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
                    placeholder="e.g. Explore Now"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA Destination (Safe URL / Path)</label>
                  <input
                    type="text"
                    value={formData.ctaDestination}
                    onChange={(e) => setFormData({ ...formData, ctaDestination: e.target.value })}
                    placeholder="e.g. /products?badge=HOT"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="bannerActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="bannerActive" className="text-sm font-medium text-gray-700">
                  Visible on Storefront (Active)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBannersPage;
