import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Plus, Edit2, Trash2, Sliders, CheckCircle, XCircle, Tag, Info } from 'lucide-react';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminAttributesPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'text',
    unit: '',
    options: [],
    isRequired: false,
    isFilterable: true
  });
  const [optionInput, setOptionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function loadCategories() {
      setIsLoadingCategories(true);
      try {
        const data = await adminCatalogueService.getCategories(false);
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryId(data[0]._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load categories');
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const loadAttributes = async (catId) => {
    if (!catId) return;
    setIsLoadingAttributes(true);
    setError('');
    try {
      const data = await adminCatalogueService.getAttributesByCategory(catId);
      setAttributes(data);
    } catch (err) {
      setError(err.message || 'Failed to load attributes');
    } finally {
      setIsLoadingAttributes(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      loadAttributes(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const handleCategoryChange = (e) => {
    setSelectedCategoryId(e.target.value);
  };

  const openCreateModal = () => {
    setEditingAttr(null);
    setFormData({
      name: '',
      code: '',
      type: 'text',
      unit: '',
      options: [],
      isRequired: false,
      isFilterable: true
    });
    setOptionInput('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (attr) => {
    setEditingAttr(attr);
    setFormData({
      name: attr.name,
      code: attr.code,
      type: attr.type,
      unit: attr.unit || '',
      options: attr.options ? [...attr.options] : [],
      isRequired: attr.isRequired || false,
      isFilterable: attr.isFilterable !== false
    });
    setOptionInput('');
    setFormError('');
    setModalOpen(true);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const generatedCode = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name,
      code: editingAttr ? prev.code : generatedCode
    }));
  };

  const handleAddOption = () => {
    const val = optionInput.trim();
    if (!val) return;
    if (formData.options.includes(val)) {
      setFormError(`Option '${val}' already exists`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, val]
    }));
    setOptionInput('');
    setFormError('');
  };

  const handleRemoveOption = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (!formData.name.trim() || !formData.code.trim()) {
        throw new Error('Attribute Name and Code are required');
      }

      if (['select', 'multiselect'].includes(formData.type) && formData.options.length === 0) {
        throw new Error(`At least one allowed option is required for '${formData.type}' type.`);
      }

      if (editingAttr) {
        await adminCatalogueService.updateAttribute(editingAttr._id, {
          name: formData.name,
          type: formData.type,
          unit: formData.unit.trim() || undefined,
          options: formData.options,
          isRequired: formData.isRequired,
          isFilterable: formData.isFilterable
        });
        setSuccessMsg(`Attribute '${formData.name}' updated successfully.`);
      } else {
        await adminCatalogueService.createAttribute({
          categoryId: selectedCategoryId,
          name: formData.name,
          code: formData.code,
          type: formData.type,
          unit: formData.unit.trim() || undefined,
          options: formData.options,
          isRequired: formData.isRequired,
          isFilterable: formData.isFilterable
        });
        setSuccessMsg(`Attribute '${formData.name}' created successfully.`);
      }

      setModalOpen(false);
      loadAttributes(selectedCategoryId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to save attribute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (attr) => {
    if (!window.confirm(`Are you sure you want to delete attribute '${attr.name}'? Existing products will retain their saved attributes.`)) {
      return;
    }

    try {
      await adminCatalogueService.deleteAttribute(attr._id);
      setSuccessMsg(`Attribute '${attr.name}' deleted.`);
      loadAttributes(selectedCategoryId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete attribute');
    }
  };

  const selectedCategory = categories.find((c) => c._id === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600" />
            Dynamic Category Attributes
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure flexible category-specific attributes (e.g. Size, Color, RAM, Storage, Material) without hardcoding database schemas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <BulkActionButtons
            module="attributes"
            moduleTitle="Dynamic Attributes"
            onSuccess={() => {
              if (selectedCategoryId) loadAttributes(selectedCategoryId);
            }}
          />
          <Button
            onClick={openCreateModal}
            disabled={!selectedCategoryId}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Attribute
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      {/* Category Selector Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label htmlFor="category-select" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Target Category:
          </label>
          {isLoadingCategories ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <LoadingSpinner size="sm" />
              Loading categories...
            </div>
          ) : (
            <select
              id="category-select"
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              className="w-full sm:w-80 rounded-lg border border-gray-300 py-2 px-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.ancestors?.length > 0 ? `${cat.ancestors.map((a) => a.name).join(' > ')} > ` : ''}
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCategory && (
          <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Attributes inherit down the hierarchy to subcategories automatically.</span>
          </div>
        )}
      </div>

      {/* Attributes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoadingAttributes ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500">Loading dynamic attributes...</p>
          </div>
        ) : attributes.length === 0 ? (
          <div className="py-16 text-center">
            <Sliders className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No dynamic attributes defined</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              {selectedCategory?.name
                ? `Category '${selectedCategory.name}' currently has no custom attributes. Products will only have standard fields.`
                : 'Select a category to view and define attributes.'}
            </p>
            {selectedCategoryId && (
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={openCreateModal}>
                  Create First Attribute
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Attribute Name</th>
                  <th className="py-3 px-4">Code / Slug</th>
                  <th className="py-3 px-4">Data Type</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Allowed Options</th>
                  <th className="py-3 px-4 text-center">Required</th>
                  <th className="py-3 px-4 text-center">Filterable</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attributes.map((attr) => (
                  <tr key={attr._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {attr.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 bg-slate-50 rounded">
                      {attr.code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize border border-blue-200">
                        {attr.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {attr.unit || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {attr.options && attr.options.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {attr.options.slice(0, 5).map((opt, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {opt}
                            </span>
                          ))}
                          {attr.options.length > 5 && (
                            <span className="text-xs text-gray-400 self-center">
                              +{attr.options.length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Free text / value</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {attr.isRequired ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {attr.isFilterable ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(attr)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="Edit Attribute"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(attr)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Attribute"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingAttr ? `Edit Attribute: ${editingAttr.name}` : 'New Dynamic Attribute'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            {formError && <Alert variant="error" message={formError} onClose={() => setFormError('')} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Attribute Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Storage Capacity, Screen Size, Fabric"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Attribute Code / Identifier *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="e.g. storage_capacity"
                  disabled={!!editingAttr}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Unique internal code used by products in this category.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Attribute Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="text">Text (Free text)</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean (Yes/No)</option>
                    <option value="select">Select (Single choice)</option>
                    <option value="multiselect">Multiselect (Multiple tags)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Unit (Optional)
                  </label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. GB, inches, kg"
                  />
                </div>
              </div>

              {/* Options Builder for select & multiselect */}
              {['select', 'multiselect'].includes(formData.type) && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Allowed Option Values *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="Add an option (e.g. 128GB) and press Add"
                      className="flex-1 rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddOption}>
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.options.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-gray-200 text-xs font-medium text-gray-800 shadow-2xs"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-gray-400 hover:text-red-500 text-sm font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {formData.options.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Please add at least one allowed value option.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Required Field
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isFilterable}
                    onChange={(e) => setFormData({ ...formData, isFilterable: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Enable Storefront Filter
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Saving...
                    </div>
                  ) : editingAttr ? (
                    'Update Attribute'
                  ) : (
                    'Create Attribute'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAttributesPage;

