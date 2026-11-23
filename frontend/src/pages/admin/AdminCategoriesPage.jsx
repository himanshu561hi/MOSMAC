import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Search,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  CornerDownRight,
  Sparkles,
  ListTree,
  Table as TableIcon
} from 'lucide-react';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';
import DeleteImpactModal from '@/components/admin/DeleteImpactModal';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'table'
  const [expandedCategories, setExpandedCategories] = useState({});

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('root'); // 'root' or 'sub'
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentId: '',
    imageUrl: '',
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

      // Auto-expand all root categories by default
      const expandMap = {};
      data.forEach((c) => {
        if (!c.parentId) {
          expandMap[c._id] = true;
        }
      });
      setExpandedCategories((prev) => ({ ...expandMap, ...prev }));
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Open modal to create a Root Category
  const openCreateRootModal = () => {
    setEditingCategory(null);
    setModalMode('root');
    setFormData({
      name: '',
      slug: '',
      parentId: '',
      imageUrl: '',
      description: '',
      displayOrder: categories.filter((c) => !c.parentId).length + 1,
      isActive: true
    });
    setFormError('');
    setModalOpen(true);
  };

  // Open modal to create a Subcategory (optionally with a pre-selected parent)
  const openCreateSubcategoryModal = (parent = null) => {
    setEditingCategory(null);
    setModalMode('sub');
    const rootCats = categories.filter((c) => !c.parentId);
    const defaultParentId = parent ? parent._id : (rootCats[0]?._id || '');
    setFormData({
      name: '',
      slug: '',
      parentId: defaultParentId,
      imageUrl: '',
      description: '',
      displayOrder: 1,
      isActive: true
    });
    setFormError('');
    setModalOpen(true);
  };

  // Open modal to edit any Category or Subcategory
  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setModalMode(cat.parentId ? 'sub' : 'root');
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || '',
      imageUrl: cat.imageUrl || '',
      description: cat.description || '',
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !editingCategory ? generatedSlug : prev.slug
    }));
  };

  const toggleExpand = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      if (!formData.name.trim()) {
        throw new Error('Category name is required');
      }

      const targetParentId = modalMode === 'sub' && formData.parentId ? formData.parentId : null;

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        parentId: targetParentId,
        imageUrl: formData.imageUrl.trim() || '',
        description: formData.description.trim(),
        displayOrder: Number(formData.displayOrder) || 0,
        isActive: formData.isActive
      };

      if (editingCategory) {
        await adminCatalogueService.updateCategory(editingCategory._id, payload);
      } else {
        await adminCatalogueService.createCategory(payload);
      }

      setModalOpen(false);
      await fetchCategories();
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    setCategoryToDelete({ _id: id, name });
    setDeleteModalOpen(true);
  };

  // Build root categories and their subcategories
  const rootCategories = categories.filter((c) => !c.parentId);
  const getSubcategories = (parentId) => categories.filter((c) => c.parentId === parentId);

  // Search filter
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Categories & Subcategories
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create and organize your product categories and nested subcategories in one place
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="categories"
            moduleTitle="Categories"
            onSuccess={fetchCategories}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => openCreateSubcategoryModal(null)}
            className="flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-emerald-600" />
            Add Subcategory
          </Button>
          <Button
            type="button"
            onClick={openCreateRootModal}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Stats Cards & Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Categories</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Main Categories</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{rootCategories.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Folder className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Subcategories</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {categories.length - rootCategories.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <CornerDownRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search categories or subcategories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              Hierarchy View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-gray-200">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-gray-500">Loading categories & subcategories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-gray-900">No Categories Created Yet</h3>
            <p className="text-xs text-gray-500 mt-1">
              Start building your store catalogue by creating a main category, then add subcategories beneath it.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={openCreateRootModal} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add First Category
            </Button>
          </div>
        </div>
      ) : viewMode === 'tree' ? (
        /* HIERARCHY TREE VIEW */
        <div className="space-y-4">
          {rootCategories
            .filter(
              (rc) =>
                !search ||
                rc.name.toLowerCase().includes(search.toLowerCase()) ||
                getSubcategories(rc._id).some((sub) =>
                  sub.name.toLowerCase().includes(search.toLowerCase())
                )
            )
            .map((rootCat) => {
              const subs = getSubcategories(rootCat._id);
              const isExpanded = expandedCategories[rootCat._id] ?? true;

              return (
                <div
                  key={rootCat._id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Root Category Header Card */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50/70 to-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(rootCat._id)}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200/60 transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {rootCat.imageUrl ? (
                          <img
                            src={rootCat.imageUrl}
                            alt={rootCat.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          rootCat.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900">
                            {rootCat.name}
                          </h3>
                          <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            /{rootCat.slug}
                          </span>
                          {rootCat.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        {rootCat.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {rootCat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions on Root Category */}
                    <div className="flex items-center gap-2 pl-9 sm:pl-0">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg font-medium mr-1">
                        {subs.length} {subs.length === 1 ? 'Subcategory' : 'Subcategories'}
                      </span>

                      {/* Direct "+ Add Subcategory" action */}
                      <button
                        type="button"
                        onClick={() => openCreateSubcategoryModal(rootCat)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                        title={`Add Subcategory under ${rootCat.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Subcategory
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(rootCat)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(rootCat._id, rootCat.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Nested Subcategories Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-white space-y-2">
                      {subs.length === 0 ? (
                        <div className="py-6 px-4 bg-gray-50/70 rounded-xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center gap-2">
                          <p className="text-xs text-gray-500">
                            No subcategories under <strong>{rootCat.name}</strong> yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => openCreateSubcategoryModal(rootCat)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 underline"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Subcategory to {rootCat.name}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {subs.map((sub) => {
                            const nestedSubs = getSubcategories(sub._id);
                            return (
                              <div
                                key={sub._id}
                                className="p-3 rounded-xl border border-gray-200 bg-gray-50/40 hover:bg-gray-50 transition-colors space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center shrink-0">
                                      <CornerDownRight className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-bold text-gray-900">
                                          {sub.name}
                                        </h4>
                                        <span className="text-[10px] font-mono text-gray-400">
                                          /{sub.slug}
                                        </span>
                                      </div>
                                      {sub.description && (
                                        <p className="text-[11px] text-gray-500 line-clamp-1">
                                          {sub.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => openCreateSubcategoryModal(sub)}
                                      className="p-1 text-gray-400 hover:text-emerald-600 rounded hover:bg-gray-200/50"
                                      title={`Add nested subcategory under ${sub.name}`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(sub)}
                                      className="p-1 text-gray-400 hover:text-emerald-600 rounded hover:bg-gray-200/50"
                                      title="Edit Subcategory"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(sub._id, sub.name)}
                                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                      title="Delete Subcategory"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Multi-level child subcategories if present */}
                                {nestedSubs.length > 0 && (
                                  <div className="pl-6 pt-1 border-t border-gray-100 flex flex-wrap gap-1.5">
                                    {nestedSubs.map((nested) => (
                                      <span
                                        key={nested._id}
                                        className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-700"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {nested.name}
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(nested)}
                                          className="text-gray-400 hover:text-emerald-600 ml-1"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* FLAT TABLE VIEW */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-900 uppercase font-semibold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3">Category Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Parent Hierarchy</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((cat) => {
                  const parent = categories.find((c) => c._id === cat.parentId);
                  return (
                    <tr key={cat._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {cat.parentId ? (
                            <CornerDownRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                          ) : (
                            <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {cat.parentId ? (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Subcategory
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Main Category
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {parent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                            <span className="font-semibold text-gray-800">{parent.name}</span>
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                            <span>{cat.name}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">None (Root)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-500">{cat.slug}</td>
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
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openCreateSubcategoryModal(cat)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 rounded hover:bg-gray-100"
                          title="Add Subcategory"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat._id, cat.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
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

      {/* UNIFIED MODAL FOR CATEGORY & SUBCATEGORY */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-100"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {modalMode === 'sub' ? (
                  <>
                    <FolderPlus className="w-5 h-5 text-emerald-600" />
                    {editingCategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                  </>
                ) : (
                  <>
                    <Layers className="w-5 h-5 text-emerald-600" />
                    {editingCategory ? 'Edit Main Category' : 'Add New Main Category'}
                  </>
                )}
              </h3>

              {!editingCategory && (
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('root');
                      setFormData((prev) => ({ ...prev, parentId: '' }));
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      modalMode === 'root'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Main Category
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('sub');
                      const rootCats = categories.filter((c) => !c.parentId);
                      setFormData((prev) => ({ ...prev, parentId: rootCats[0]?._id || '' }));
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      modalMode === 'sub'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Subcategory
                  </button>
                </div>
              )}
            </div>

            {formError && <Alert type="error" message={formError} onClose={() => setFormError('')} />}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Parent Category Selector (Shown when in Subcategory Mode) */}
              {modalMode === 'sub' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Choose Parent Category *
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="" disabled>
                      Select which category this belongs to...
                    </option>
                    {categories
                      .filter((c) => !editingCategory || c._id !== editingCategory._id)
                      .map((c) => {
                        const parent = categories.find((p) => p._id === c.parentId);
                        return (
                          <option key={c._id} value={c._id}>
                            {parent ? `${parent.name} → ${c.name}` : c.name}
                          </option>
                        );
                      })}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    This subcategory will appear directly nested under the selected category.
                  </p>
                </div>
              )}

              {/* Name Input */}
              <Input
                label={modalMode === 'sub' ? 'Subcategory Name *' : 'Category Name *'}
                placeholder={modalMode === 'sub' ? 'e.g. Smart Watches, Laptops, T-Shirts' : 'e.g. Electronics, Fashion, Home'}
                required
                value={formData.name}
                onChange={handleNameChange}
              />

              {/* Slug Input */}
              <Input
                label="URL Slug"
                placeholder="auto-generated from name"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />

              {/* Image URL Input */}
              <Input
                label="Image / Banner URL (Optional)"
                placeholder="https://images.unsplash.com/... or CDN link"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Short description for customer discovery & SEO..."
                />
              </div>

              {/* Display Order & Active Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Input
                  label="Display Order"
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                />
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    Active & Visible
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Saving...'
                  ) : editingCategory ? (
                    'Save Changes'
                  ) : modalMode === 'sub' ? (
                    'Add Subcategory'
                  ) : (
                    'Create Category'
                  )}
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
        type="category"
        item={categoryToDelete}
        onDeleted={fetchCategories}
      />
    </div>
  );
}

export default AdminCategoriesPage;
