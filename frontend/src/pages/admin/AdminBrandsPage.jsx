import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Tag, Search, CheckCircle, XCircle, ExternalLink, Sparkles } from 'lucide-react';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';
import DeleteImpactModal from '@/components/admin/DeleteImpactModal';

const PLACEMENT_OPTIONS = [
  { key: 'isMosmacLoves', label: 'Mosmac Loves', desc: 'Shows in "Mosmac Loves" tab' },
  { key: 'isTopBrand', label: 'Top Brands', desc: 'Shows in "Top Brands" tab' },
  { key: 'isNewlyAdded', label: 'Newly Added', desc: 'Shows in "Newly Added Brands" tab' },
  { key: 'isFeatured', label: 'Featured Brand', desc: 'Shows in "Featured Brands" tab' },
  { key: 'isMosmacRed', label: 'Mosmac Red', desc: 'Shows in "Mosmac Red" tab' },
  { key: 'isHomegrown', label: 'Homegrown', desc: 'Shows in "Homegrown" tab' }
];

export function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    description: '',
    website: '',
    isActive: true,
    isMosmacLoves: false,
    isTopBrand: false,
    isNewlyAdded: false,
    isFeatured: false,
    isMosmacRed: false,
    isHomegrown: false
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
      isActive: true,
      isMosmacLoves: false,
      isTopBrand: false,
      isNewlyAdded: false,
      isFeatured: false,
      isMosmacRed: false,
      isHomegrown: false
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
      isActive: brand.isActive !== false,
      isMosmacLoves: Boolean(brand.isMosmacLoves),
      isTopBrand: Boolean(brand.isTopBrand),
      isNewlyAdded: Boolean(brand.isNewlyAdded),
      isFeatured: Boolean(brand.isFeatured),
      isMosmacRed: Boolean(brand.isMosmacRed),
      isHomegrown: Boolean(brand.isHomegrown)
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
        isActive: formData.isActive,
        isMosmacLoves: formData.isMosmacLoves,
        isTopBrand: formData.isTopBrand,
        isNewlyAdded: formData.isNewlyAdded,
        isFeatured: formData.isFeatured,
        isMosmacRed: formData.isMosmacRed,
        isHomegrown: formData.isHomegrown
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

  const openDeleteModal = (brand) => {
    setBrandToDelete(brand);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brand Directory</h1>
          <p className="text-xs text-gray-500">Manage manufacturers, brand logos, and storefront mega-menu placement</p>
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-900 uppercase font-semibold border-b border-gray-200 text-[11px]">
              <tr>
                <th className="px-5 py-3">Brand Name</th>
                <th className="px-5 py-3">Mega-Menu Placement</th>
                <th className="px-5 py-3">Website</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      {b.logoUrl ? (
                        <div className="w-12 h-8 rounded border border-gray-100 p-0.5 bg-white flex items-center justify-center shrink-0">
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                          <Tag className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{b.name}</div>
                        <div className="font-mono text-[10px] text-gray-400">{b.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {b.isMosmacLoves && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-red-100 text-red-700 font-semibold">
                          Mosmac Loves
                        </span>
                      )}
                      {b.isTopBrand && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-blue-100 text-blue-700 font-semibold">
                          Top Brands
                        </span>
                      )}
                      {b.isNewlyAdded && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-purple-100 text-purple-700 font-semibold">
                          Newly Added
                        </span>
                      )}
                      {b.isFeatured && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-emerald-100 text-emerald-700 font-semibold">
                          Featured
                        </span>
                      )}
                      {b.isMosmacRed && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-rose-100 text-rose-700 font-semibold">
                          Mosmac Red
                        </span>
                      )}
                      {b.isHomegrown && (
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-amber-100 text-amber-800 font-semibold">
                          Homegrown
                        </span>
                      )}
                      {!b.isMosmacLoves && !b.isTopBrand && !b.isNewlyAdded && !b.isFeatured && !b.isMosmacRed && !b.isHomegrown && (
                        <span className="text-gray-400 text-[10px]">Directory only</span>
                      )}
                    </div>
                  </td>
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
                      className="p-1.5 text-gray-500 hover:text-emerald-600 rounded hover:bg-gray-100 transition-colors"
                      title="Edit Brand"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(b)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Delete Brand"
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

      {/* Add / Edit Brand Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900">
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </h3>

            {formError && <Alert type="error" message={formError} />}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <Input
                label="Brand Name"
                placeholder="e.g. MOSMAC, IMAGIC, Lakmé, Maybelline"
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

              {/* Brand Logo URL with pixel dimensions requirement & live preview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Brand Logo URL
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                    Required: 400 × 200 px
                  </span>
                </div>
                <Input
                  placeholder="https://res.cloudinary.com/.../brand-logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
                <p className="text-[11px] text-gray-500">
                  📐 <strong>Recommended Logo Size:</strong> 400 × 200 px (Aspect ratio 2:1) or 300 × 300 px square.
                  <br />
                  💡 <em>Best practice:</em> Transparent PNG or SVG with centered logo and padding around edges.
                </p>

                {/* Live Brand Card Preview */}
                {formData.logoUrl && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Storefront Tile Live Preview (400 × 200 px)
                    </span>
                    <div className="h-20 w-48 mx-auto bg-white rounded-xl border border-slate-200 p-2 flex flex-col items-center justify-center shadow-xs">
                      <div className="h-10 w-full flex items-center justify-center">
                        <img
                          src={formData.logoUrl}
                          alt="Brand Logo Preview"
                          className="max-h-10 max-w-[85%] object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <span className="hidden text-xs font-bold text-slate-800 uppercase">
                          {formData.name || 'Brand Name'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 truncate">
                        {formData.name || 'Brand Name'}
                      </span>
                    </div>
                  </div>
                )}
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

              {/* Mega-Menu Placement Toggles */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <Sparkles className="w-3.5 h-3.5 text-[#E04038]" />
                  <span>Storefront Mega-Menu Placement</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Toggle which tabs this brand appears under in the desktop header Mega Menu.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {PLACEMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                        formData[opt.key]
                          ? 'bg-white border-[#E04038] shadow-2xs'
                          : 'bg-white/60 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData[opt.key])}
                        onChange={(e) =>
                          setFormData({ ...formData, [opt.key]: e.target.checked })
                        }
                        className="rounded text-[#E04038] focus:ring-[#E04038] w-4 h-4 mt-0.5"
                      />
                      <div>
                        <div className="font-semibold text-gray-900 text-xs">{opt.label}</div>
                        <div className="text-[10px] text-gray-500">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Active Brand (Visible on storefront)
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

      {/* Delete Impact Modal with Product Dependencies Check */}
      <DeleteImpactModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        type="brand"
        item={brandToDelete}
        onDeleted={fetchBrands}
      />
    </div>
  );
}

export default AdminBrandsPage;