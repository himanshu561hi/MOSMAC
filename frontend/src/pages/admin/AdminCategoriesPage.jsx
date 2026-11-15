import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Layers, Search, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    description: '',
    displayOrder: 0,
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCategories = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminCatalogueService.getCategories(false);
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      description: '',
      displayOrder: categories.length,
      isActive: true
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || '',
      description: cat.description || '',
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name,
        slug: formData.slug || undefined,
        parentId: formData.parentId ? formData.parentId : null,
        description: formData.description,
        displayOrder: Number(formData.displayOrder),
        isActive: formData.isActive
      };

      if (editingCategory) {
        await adminCatalogueService.updateCategory(editingCategory._id, payload);
      } else {
        await adminCatalogueService.createCategory(payload);
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? This cannot be undone.`)) return;
    try {
      await adminCatalogueService.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Category Hierarchy</h1>
          <p className="text-xs text-gray-500">Manage multi-category tree and nested subcategories</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="categories"
            moduleTitle="Categories"
            onSuccess={fetchCategories}
          />
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="text-xs text-gray-500">
          Showing <strong>{filteredCategories.length}</strong> categories
        </div>
      </div>

      {/* Table List */}
      {isLoading ? (
        <LoadingSpinner message="Loading categories..." />
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
          No categories found. Click "Add Category" to create your first catalogue category.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-900 uppercase font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Category Name</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Hierarchy / Parent</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((cat) => {
                  const parentName = categories.find((c) => c._id === cat.parentId)?.name;
                  return (
                    <tr key={cat._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-500">{cat.slug}</td>
                      <td className="px-5 py-3.5">
                        {parentName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {parentName} <ChevronRight className="w-3 h-3 text-gray-400" /> {cat.name}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Root Category
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">{cat.displayOrder}</td>
                      <td className="px-5 py-3.5">
                        {cat.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 rounded hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat._id, cat.name)}
                          className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>

            {formError && <Alert type="error" message={formError} />}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <Input
                label="Category Name"
                placeholder="e.g. Smart Watches"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="SEO Slug (Optional)"
                placeholder="auto-generated from name if blank"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="">None (Top-Level Root Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c._id !== editingCategory._id)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
                  placeholder="Optional brief description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Display Order"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                />
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    Active Category
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCategoriesPage;

