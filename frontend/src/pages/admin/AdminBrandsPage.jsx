import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Tag, Search, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    description: '',
    website: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchBrands = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminCatalogueService.getBrands(search);
      setBrands(data);
    } catch (err) {
      setError(err.message || 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [search]);

  const openCreateModal = () => {
    setEditingBrand(null);
    setFormData({
      name: '',
      slug: '',
      logoUrl: '',
      description: '',
      website: '',
      isActive: true
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
      description: brand.description || '',
      website: brand.website || '',
      isActive: brand.isActive !== false
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
        logoUrl: formData.logoUrl,
        description: formData.description,
        website: formData.website,
        isActive: formData.isActive
      };

      if (editingBrand) {
        await adminCatalogueService.updateBrand(editingBrand._id, payload);
      } else {
        await adminCatalogueService.createBrand(payload);
      }

      setModalOpen(false);
      fetchBrands();
    } catch (err) {
      setFormError(err.message || 'Failed to save brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete brand "${name}"?`)) return;
    try {
      await adminCatalogueService.deleteBrand(id);
      fetchBrands();
    } catch (err) {
      alert(err.message || 'Failed to delete brand');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brand Directory</h1>
          <p className="text-xs text-gray-500">Manage manufacturers and product brands</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="brands"
            moduleTitle="Brands"
            onSuccess={fetchBrands}
          />
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" /> Add Brand
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
        </div>
        <div className="text-xs text-gray-500">
          Showing <strong>{brands.length}</strong> brands
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading brands..." />
      ) : brands.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-500">
          No brands found. Click "Add Brand" to register a manufacturer.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-900 uppercase font-semibold border-b border-gray-200 text-[11px]">
              <tr>
                <th className="px-5 py-3">Brand Name</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Website</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{b.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-500">{b.slug}</td>
                  <td className="px-5 py-3.5">
                    {b.website ? (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                      >
                        {b.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {b.isActive ? (
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
                      onClick={() => openEditModal(b)}
                      className="p-1.5 text-gray-500 hover:text-emerald-600 rounded hover:bg-gray-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b._id, b.name)}
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </h3>

            {formError && <Alert type="error" message={formError} />}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <Input
                label="Brand Name"
                placeholder="e.g. Apple, Nike, Sony"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="Slug (Optional)"
                placeholder="auto-generated from name if blank"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />

              <Input
                label="Website URL"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />

              <Input
                label="Logo Image URL"
                placeholder="https://res.cloudinary.com/..."
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />

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

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Active Brand
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  {editingBrand ? 'Save Changes' : 'Create Brand'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBrandsPage;

