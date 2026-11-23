import React, { useState, useEffect, useMemo, useRef } from 'react';
import { homepageSectionService } from '@/services/homepageSectionService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import {
  X,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Save,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';

export function ManageSectionProductsModal({ section, isOpen, onClose, onUpdated }) {
  if (!isOpen || !section) return null;

  // Assigned products state
  const [assignedProducts, setAssignedProducts] = useState([]);
  const [initialProductsState, setInitialProductsState] = useState([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Selected for bulk deletion
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');

  // Product Catalog Selector state
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogPagination, setCatalogPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [catalogBrand, setCatalogBrand] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('published');
  const [categoriesList, setCategoriesList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);

  // Fetch assigned products for this section
  const fetchAssigned = async () => {
    setIsLoadingAssigned(true);
    setErrorMessage('');
    try {
      const data = await homepageSectionService.getSectionProducts(section._id);
      // Ensure each product has displayOrder
      const ordered = data.map((item, idx) => ({
        ...item,
        displayOrder: item.displayOrder !== undefined ? item.displayOrder : idx + 1
      }));
      setAssignedProducts(ordered);
      setInitialProductsState(JSON.stringify(ordered.map((p) => ({ id: p._id, order: p.displayOrder }))));
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load assigned products');
    } finally {
      setIsLoadingAssigned(false);
    }
  };

  // Fetch searchable catalog products
  const fetchCatalog = async (page = 1) => {
    setIsLoadingCatalog(true);
    try {
      const res = await homepageSectionService.searchProducts({
        page,
        limit: 8,
        search: catalogSearch,
        category: catalogCategory,
        brand: catalogBrand,
        status: catalogStatus
      });
      setCatalogProducts(res.products);
      setCatalogPagination(res.pagination);
      if (res.categories?.length > 0) setCategoriesList(res.categories);
      if (res.brands?.length > 0) setBrandsList(res.brands);
    } catch (err) {
      console.error('Failed to search catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
    fetchCatalog(1);
  }, [section._id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogSearch, catalogCategory, catalogBrand, catalogStatus]);

  // Unsaved changes check
  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify(assignedProducts.map((p) => ({ id: p._id, order: p.displayOrder })));
    return current !== initialProductsState;
  }, [assignedProducts, initialProductsState]);

  // Set of assigned product IDs for quick lookup
  const assignedIdSet = useMemo(() => {
    return new Set(assignedProducts.map((p) => p._id));
  }, [assignedProducts]);

  // Add product to section
  const handleAddProduct = (prod) => {
    if (assignedIdSet.has(prod._id)) return;
    const nextOrder = assignedProducts.length > 0
      ? Math.max(...assignedProducts.map((p) => p.displayOrder || 0)) + 1
      : 1;

    setAssignedProducts((prev) => [
      ...prev,
      {
        ...prod,
        displayOrder: nextOrder
      }
    ]);
  };

  // Remove single product
  const handleRemoveProduct = (productId) => {
    setAssignedProducts((prev) => prev.filter((p) => p._id !== productId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  // Bulk remove selected products
  const handleBulkRemove = () => {
    if (selectedIds.size === 0) return;
    setAssignedProducts((prev) => prev.filter((p) => !selectedIds.has(p._id)));
    setSelectedIds(new Set());
  };

  // Move product up
  const handleMoveUp = (index) => {
    if (index === 0) return;
    setAssignedProducts((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy.map((p, idx) => ({ ...p, displayOrder: idx + 1 }));
    });
  };

  // Move product down
  const handleMoveDown = (index) => {
    if (index === assignedProducts.length - 1) return;
    setAssignedProducts((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy.map((p, idx) => ({ ...p, displayOrder: idx + 1 }));
    });
  };

  // Manual display order input change
  const handleDisplayOrderChange = (productId, newOrderVal) => {
    const parsed = parseInt(newOrderVal, 10);
    setAssignedProducts((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, displayOrder: isNaN(parsed) ? 1 : parsed } : p))
    );
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setSaveSuccess('');
    try {
      const payload = assignedProducts.map((p, idx) => ({
        productId: p._id,
        displayOrder: p.displayOrder !== undefined ? p.displayOrder : idx + 1
      }));

      await homepageSectionService.updateSectionProducts(section._id, payload);
      setSaveSuccess(`Successfully updated ${payload.length} products for "${section.name}"!`);
      setInitialProductsState(JSON.stringify(payload.map((p) => ({ id: p.productId, order: p.displayOrder }))));
      onUpdated?.();
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save product assignments');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter assigned products by search term
  const filteredAssignedProducts = useMemo(() => {
    if (!assignedSearchTerm.trim()) return assignedProducts;
    const term = assignedSearchTerm.toLowerCase();
    return assignedProducts.filter((p) =>
      p.title?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.category?.name?.toLowerCase().includes(term)
    );
  }, [assignedProducts, assignedSearchTerm]);

  // Bulk select toggles
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredAssignedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssignedProducts.map((p) => p._id)));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Managing Products: {section.name}
                </h2>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  slug: {section.slug}
                </span>
                {section.isDefault && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    System Default
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {section.heading ? `"${section.heading}"` : section.description || 'Arrange and assign products displayed on the homepage.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> Unsaved changes
              </span>
            )}
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
                }
                onClose();
              }}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {saveSuccess && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {errorMessage && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body: 2-Column Responsive Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          
          {/* Column 1: Search & Product Catalog Selector (5 cols) */}
          <div className="lg:col-span-5 p-5 flex flex-col gap-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-600" /> Catalog Selector
                </h3>
                <p className="text-[11px] text-gray-500">
                  Search catalog products to assign to this section
                </p>
              </div>
              <span className="text-[11px] font-semibold text-gray-500">
                Found: <strong className="text-gray-900">{catalogPagination.total}</strong>
              </span>
            </div>

            {/* Catalog Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name, SKU, or keywords..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={catalogCategory}
                  onChange={(e) => setCatalogCategory(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <select
                  value={catalogBrand}
                  onChange={(e) => setCatalogBrand(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Brands</option>
                  {brandsList.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Catalog Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[480px] pr-1">
              {isLoadingCatalog ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2">
                  <LoadingSpinner size="md" />
                  <span className="text-xs text-gray-400">Loading catalog...</span>
                </div>
              ) : catalogProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  No matching products found in catalog.
                </div>
              ) : (
                catalogProducts.map((prod) => {
                  const isAssigned = assignedIdSet.has(prod._id);
                  const priceFormatted = `₹${(prod.price || 0).toLocaleString('en-IN')}`;

                  return (
                    <div
                      key={prod._id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isAssigned
                          ? 'bg-emerald-50/40 border-emerald-200 opacity-80'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                          {(() => {
                            const imgSrc = prod.image || prod.imageUrl || prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url;
                            return imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={prod.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package className="w-5 h-5" />
                              </div>
                            );
                          })()}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {prod.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                            {prod.sku && <span className="font-mono text-gray-400">SKU: {prod.sku}</span>}
                            <span>•</span>
                            <span className="font-semibold text-gray-800">{priceFormatted}</span>
                          </div>
                          {prod.category?.name && (
                            <span className="text-[10px] text-gray-400 block truncate">
                              {prod.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isAssigned ? 'secondary' : 'primary'}
                        disabled={isAssigned}
                        onClick={() => handleAddProduct(prod)}
                        className="text-[11px] px-2.5 py-1 flex-shrink-0"
                      >
                        {isAssigned ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Added
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Add
                          </span>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Catalog Pagination */}
            {catalogPagination.totalPages > 1 && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 border-t border-gray-200/60">
                <span>
                  Page {catalogPagination.page} of {catalogPagination.totalPages}
                </span>
                <Pagination
                  totalPages={catalogPagination.totalPages}
                  value={catalogPagination.page}
                  onChange={(p) => fetchCatalog(p)}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* Column 2: Assigned Products Table & Reordering (7 cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col gap-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Assigned Products ({assignedProducts.length})
                  </h3>
                  {section.maxProducts && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      assignedProducts.length > section.maxProducts
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      Max homepage display: {section.maxProducts}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Products will display on the storefront in the exact sequence shown below.
                </p>
              </div>

              {/* Bulk actions & search */}
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleBulkRemove}
                    className="text-xs px-2.5 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove ({selectedIds.size})
                  </Button>
                )}
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter assigned..."
                    value={assignedSearchTerm}
                    onChange={(e) => setAssignedSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Assigned Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl min-h-[300px] max-h-[500px]">
              {isLoadingAssigned ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <LoadingSpinner size="md" />
                  <span className="text-xs text-gray-400">Loading assigned products...</span>
                </div>
              ) : filteredAssignedProducts.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-xs p-6 space-y-2">
                  <Package className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="font-semibold text-gray-600">No products currently assigned.</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Select products from the catalog on the left to add them to "{section.name}".
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0 z-10 font-semibold">
                    <tr>
                      <th className="py-2.5 pl-3 pr-1 w-8">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          {selectedIds.size === filteredAssignedProducts.length && filteredAssignedProducts.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-2 w-14 text-center">Order</th>
                      <th className="py-2.5 px-2 w-12">Product</th>
                      <th className="py-2.5 px-2">Details</th>
                      <th className="py-2.5 px-2">Price</th>
                      <th className="py-2.5 px-2 text-center w-20">Move</th>
                      <th className="py-2.5 pr-3 pl-2 text-right w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssignedProducts.map((prod, index) => {
                      const isSelected = selectedIds.has(prod._id);
                      const priceFormatted = `₹${(prod.price || 0).toLocaleString('en-IN')}`;

                      return (
                        <tr
                          key={prod._id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2 pl-3 pr-1">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(prod._id)}
                              className="text-gray-400 hover:text-gray-700"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Order Input */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={prod.displayOrder}
                              onChange={(e) => handleDisplayOrderChange(prod._id, e.target.value)}
                              className="w-11 px-1.5 py-1 text-center font-bold text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                          </td>

                          {/* Image */}
                          <td className="py-2 px-2">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-100">
                              {(() => {
                                const imgSrc = prod.image || prod.imageUrl || prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url;
                                return imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={prod.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Package className="w-4 h-4" />
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Details */}
                          <td className="py-2 px-2 min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[200px]" title={prod.title}>
                              {prod.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                              {prod.sku && <span className="font-mono">SKU: {prod.sku}</span>}
                              {prod.category?.name && (
                                <>
                                  <span>•</span>
                                  <span>{prod.category.name}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-2 px-2 font-semibold text-gray-900">
                            {priceFormatted}
                          </td>

                          {/* Move Up / Down Buttons */}
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveUp(index)}
                                title="Move Up"
                                className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-20"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === filteredAssignedProducts.length - 1}
                                onClick={() => handleMoveDown(index)}
                                title="Move Down"
                                className="p-1 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-20"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Remove */}
                          <td className="py-2 pr-3 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(prod._id)}
                              title="Remove product"
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Summary & Save Button */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Total Products: <strong className="text-gray-900">{assignedProducts.length}</strong>
                {section.maxProducts && assignedProducts.length > section.maxProducts && (
                  <span className="text-amber-700 font-semibold ml-2">
                    (First {section.maxProducts} will be visible on homepage)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveChanges}
                  isLoading={isSaving}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageSectionProductsModal;
