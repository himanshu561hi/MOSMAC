import React, { useState, useEffect } from 'react';
import { homepageSectionService } from '@/services/homepageSectionService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { X, Layers, Plus, Save, Sparkles } from 'lucide-react';

export function CreateSectionModal({ section = null, isOpen, onClose, onSaved }) {
  if (!isOpen) return null;

  const isEditing = Boolean(section && section._id);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    heading: '',
    subtitle: '',
    type: 'product_grid',
    maxProducts: 8,
    displayPosition: 1,
    showViewAll: true,
    viewAllLink: '/products',
    isActive: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name || '',
        slug: section.slug || '',
        description: section.description || '',
        heading: section.heading || '',
        subtitle: section.subtitle || '',
        type: section.type || 'product_grid',
        maxProducts: section.maxProducts || 8,
        displayPosition: section.displayPosition || 1,
        showViewAll: section.showViewAll !== undefined ? section.showViewAll : true,
        viewAllLink: section.viewAllLink || '/products',
        isActive: section.isActive !== undefined ? section.isActive : true
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        heading: '',
        subtitle: '',
        type: 'product_grid',
        maxProducts: 8,
        displayPosition: 1,
        showViewAll: true,
        viewAllLink: '/products',
        isActive: true
      });
    }
    setErrorMessage('');
  }, [section, isOpen]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    if (!isEditing) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setFormData((prev) => ({
        ...prev,
        name,
        slug: generatedSlug,
        heading: prev.heading || name
      }));
    } else {
      setFormData((prev) => ({ ...prev, name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (!formData.name.trim()) throw new Error('Section name is required');
      if (!formData.slug.trim()) throw new Error('Section slug is required');

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        description: formData.description.trim(),
        heading: formData.heading.trim() || formData.name.trim(),
        subtitle: formData.subtitle.trim(),
        type: formData.type || 'product_grid',
        maxProducts: parseInt(formData.maxProducts, 10) || 8,
        displayPosition: parseInt(formData.displayPosition, 10) || 1,
        showViewAll: Boolean(formData.showViewAll),
        viewAllLink: formData.viewAllLink.trim() || '/products',
        isActive: Boolean(formData.isActive)
      };

      if (isEditing) {
        await homepageSectionService.updateSection(section._id, payload);
      } else {
        await homepageSectionService.createSection(payload);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save homepage section');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? `Edit Section: ${section.name}` : 'Create Custom Homepage Section'}
              </h2>
              <p className="text-xs text-gray-500">
                Configure display settings and storefront visibility
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Section Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Top Deals"
                value={formData.name}
                onChange={handleNameChange}
                required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Slug / Identifier *
              </label>
              <input
                type="text"
                placeholder="e.g. top_deals"
                value={formData.slug}
                disabled={isEditing && section.isDefault}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 font-mono"
              />
              {isEditing && section.isDefault && (
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  System default slugs cannot be altered.
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Internal Description
            </label>
            <input
              type="text"
              placeholder="e.g. High-conversion discounted products for weekend promotions"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Homepage Heading
              </label>
              <input
                type="text"
                placeholder="e.g. Exclusive Weekend Steals"
                value={formData.heading}
                onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Homepage Subtitle
              </label>
              <input
                type="text"
                placeholder="e.g. Handpicked deals expiring soon"
                value={formData.subtitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Max Display Count
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.maxProducts}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxProducts: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display Position
              </label>
              <input
                type="number"
                min="1"
                value={formData.displayPosition}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayPosition: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Section Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="product_grid">Product Grid (Responsive)</option>
                <option value="featured_carousel">Featured Carousel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                View All Link URL
              </label>
              <input
                type="text"
                placeholder="/products?category=makeup"
                value={formData.viewAllLink}
                onChange={(e) => setFormData((prev) => ({ ...prev, viewAllLink: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
              />
            </div>

            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showViewAll}
                  onChange={(e) => setFormData((prev) => ({ ...prev, showViewAll: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-gray-700">Show "View All" Button</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-gray-900">Active on Storefront</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              {isEditing ? 'Update Section' : 'Create Section'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSectionModal;
