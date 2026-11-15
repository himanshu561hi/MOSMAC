import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import {
  LayoutTemplate,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders
} from 'lucide-react';

const SECTION_TYPE_LABELS = {
  hero_banner: 'Hero Banner Carousel',
  category_grid: 'Category Quick Grid',
  featured_products: 'Featured Products Showcase',
  new_arrivals: 'New Arrivals Carousel',
  best_sellers: 'Best Sellers Leaderboard',
  promo_banner: 'Promotional Banner Grid',
  brand_showcase: 'Brand Partner Logos',
  newsletter: 'Newsletter Subscription Card',
  custom_content: 'Custom Rich Content Box'
};

export function AdminHomepageBuilderPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    sectionType: 'featured_products',
    title: '',
    subtitle: '',
    layoutType: 'grid',
    limit: 8,
    customHtml: '',
    ctaText: '',
    ctaLink: '',
    isActive: true
  });

  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.listAdminSections();
      setSections(data);
    } catch (err) {
      setError(err.message || 'Failed to load homepage sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const openCreateModal = () => {
    setEditingSection(null);
    setFormData({
      sectionType: 'featured_products',
      title: '',
      subtitle: '',
      layoutType: 'grid',
      limit: 8,
      customHtml: '',
      ctaText: '',
      ctaLink: '',
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (section) => {
    setEditingSection(section);
    setFormData({
      sectionType: section.sectionType,
      title: section.title || '',
      subtitle: section.subtitle || '',
      layoutType: section.config?.layoutType || 'grid',
      limit: section.config?.limit || 8,
      customHtml: section.config?.customHtml || '',
      ctaText: section.config?.ctaText || '',
      ctaLink: section.config?.ctaLink || '',
      isActive: section.isActive
    });
    setModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        sectionType: formData.sectionType,
        title: formData.title,
        subtitle: formData.subtitle,
        isActive: formData.isActive,
        config: {
          layoutType: formData.layoutType,
          limit: Number(formData.limit) || 8,
          customHtml: formData.customHtml,
          ctaText: formData.ctaText,
          ctaLink: formData.ctaLink
        }
      };

      if (editingSection) {
        await cmsService.updateSection(editingSection._id, payload);
        setSuccessMsg('Section updated successfully');
      } else {
        payload.displayOrder = sections.length + 1;
        await cmsService.createSection(payload);
        setSuccessMsg('Section added to homepage layout');
      }

      setModalOpen(false);
      await loadSections();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (section) => {
    try {
      await cmsService.updateSection(section._id, { isActive: !section.isActive });
      setSections((prev) =>
        prev.map((s) => (s._id === section._id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle active status');
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    // Update display orders
    const reordered = newSections.map((s, idx) => ({
      id: s._id,
      displayOrder: idx + 1
    }));

    setSections(newSections);

    try {
      await cmsService.reorderSections(reordered);
    } catch (err) {
      setError('Failed to persist section order');
      loadSections();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this section from the homepage?')) return;
    try {
      await cmsService.deleteSection(id);
      setSections((prev) => prev.filter((s) => s._id !== id));
      setSuccessMsg('Section removed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete section');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-indigo-600" />
            Homepage Section Builder
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Order and configure dynamic catalogue blocks shown on the customer storefront.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Homepage Section
        </button>
      </div>

      {/* Notifications */}
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

      {/* Sections Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-sm text-gray-500">Loading homepage layout...</span>
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <LayoutTemplate className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Custom Sections Configured</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            The storefront is currently showing the automatic catalogue fallback. Add your first custom section above!
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Section
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 shadow-sm overflow-hidden">
          {sections.map((section, index) => (
            <div
              key={section._id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                !section.isActive ? 'bg-gray-50 opacity-75' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Reorder Up/Down */}
                <div className="flex flex-col gap-1 items-center justify-center">
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-xs font-semibold text-gray-500">{index + 1}</span>
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === sections.length - 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      {SECTION_TYPE_LABELS[section.sectionType] || section.sectionType}
                    </span>
                    {!section.isActive && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                        Hidden
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mt-1">
                    {section.title || '(No Title)'}
                  </h3>
                  {section.subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{section.subtitle}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Layout: <strong className="text-gray-600 capitalize">{section.config?.layoutType || 'Grid'}</strong></span>
                    <span>Limit: <strong className="text-gray-600">{section.config?.limit || 8} items</strong></span>
                  </div>
                </div>
              </div>

              {/* Row Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleToggleActive(section)}
                  className={`p-2 rounded-lg border transition ${
                    section.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={section.isActive ? 'Section is visible on storefront' : 'Section is hidden'}
                >
                  {section.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => openEditModal(section)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                  title="Edit Section"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(section._id)}
                  className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                  title="Delete Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Section Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSection ? 'Edit Homepage Section' : 'Add New Homepage Section'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Type *
                </label>
                <select
                  value={formData.sectionType}
                  onChange={(e) => setFormData({ ...formData, sectionType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  disabled={!!editingSection}
                >
                  {Object.entries(SECTION_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Headline / Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Handcrafted Leather Essentials"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle / Supporting Copy
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Premium full-grain accessories built for daily utility"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Layout Type
                  </label>
                  <select
                    value={formData.layoutType}
                    onChange={(e) => setFormData({ ...formData, layoutType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="grid">Grid (Responsive)</option>
                    <option value="carousel">Horizontal Carousel</option>
                    <option value="banner">Full Width Feature</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {formData.sectionType === 'custom_content' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Rich Content (Sanitized HTML)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.customHtml}
                    onChange={(e) => setFormData({ ...formData, customHtml: e.target.value })}
                    placeholder="<div>Your custom announcement banner or promotional copy</div>"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="e.g. View All Products"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CTA Destination Link
                  </label>
                  <input
                    type="text"
                    value={formData.ctaLink}
                    onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                    placeholder="e.g. /products?category=lighting"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sectionActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="sectionActive" className="text-sm font-medium text-gray-700">
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSection ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHomepageBuilderPage;
