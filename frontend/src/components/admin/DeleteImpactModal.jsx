import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  AlertTriangle,
  Trash2,
  Package,
  Layers,
  CheckCircle,
  ExternalLink,
  X
} from 'lucide-react';

export function DeleteImpactModal({
  isOpen,
  onClose,
  type = 'brand', // 'brand' | 'category'
  item, // { _id, name }
  onDeleted
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  const isCategory = type === 'category';
  const typeLabel = isCategory ? 'Category' : 'Brand';

  const loadPreview = async () => {
    if (!item?._id) return;
    setIsLoading(true);
    setError('');
    try {
      let data;
      if (isCategory) {
        data = await adminCatalogueService.getCategoryDeletePreview(item._id);
      } else {
        data = await adminCatalogueService.getBrandDeletePreview(item._id);
      }
      setPreviewData(data);
    } catch (err) {
      setError(err.message || `Failed to check ${typeLabel.toLowerCase()} dependencies`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && item?._id) {
      loadPreview();
    } else {
      setPreviewData(null);
      setError('');
    }
  }, [isOpen, item?._id]);

  if (!isOpen || !item) return null;

  // Direct safe delete (when 0 products / subcategories)
  const handleDirectDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      if (isCategory) {
        await adminCatalogueService.deleteCategory(item._id, false);
      } else {
        await adminCatalogueService.deleteBrand(item._id, false);
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.message || `Failed to delete ${typeLabel.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Cascade delete (deletes/archives products and deletes entity)
  const handleCascadeDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      if (isCategory) {
        await adminCatalogueService.deleteCategory(item._id, true);
      } else {
        await adminCatalogueService.deleteBrand(item._id, true);
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.message || `Failed to cascade delete ${typeLabel.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete a single product directly from the preview list
  const handleDeleteSingleProduct = async (productId, productTitle) => {
    if (!window.confirm(`Permanently remove product "${productTitle}"?`)) return;
    setDeletingProductId(productId);
    setError('');
    try {
      await adminCatalogueService.deleteProductPermanent(productId);
      // Remove product from local preview state
      setPreviewData((prev) => {
        if (!prev) return prev;
        const updatedProducts = prev.products.filter((p) => p._id !== productId);
        const subCount = prev.subcategories?.length || 0;
        return {
          ...prev,
          products: updatedProducts,
          totalProducts: updatedProducts.length,
          canDirectlyDelete: updatedProducts.length === 0 && subCount === 0
        };
      });
    } catch (err) {
      setError(err.message || 'Failed to remove product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const products = previewData?.products || [];
  const subcategories = previewData?.subcategories || [];
  const hasDependencies = products.length > 0 || subcategories.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-5 shadow-2xl border border-gray-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Delete {typeLabel}: <span className="text-red-600 font-extrabold">{item.name}</span>
              </h3>
              <p className="text-xs text-gray-500">
                Review assigned products and dependencies before removing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <Alert type="error" message={error} />}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <LoadingSpinner message="Checking dependencies and product records..." />
            </div>
          ) : !hasDependencies ? (
            /* Safe to delete state */
            <div className="p-6 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-2 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-emerald-900">
                Safe to Delete
              </p>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                No products {isCategory ? 'or subcategories' : ''} are currently assigned to{' '}
                <strong>{item.name}</strong>. Deleting will immediately remove this {typeLabel.toLowerCase()}.
              </p>
            </div>
          ) : (
            /* Dependencies found state */
            <div className="space-y-4">
              {/* Warning Alert */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-bold text-amber-900">
                    Cannot delete empty: {products.length} product{products.length === 1 ? '' : 's'}{' '}
                    {subcategories.length > 0 && `and ${subcategories.length} subcategories `}
                    linked to this {typeLabel.toLowerCase()}.
                  </p>
                  <p className="text-amber-700 leading-relaxed">
                    You can remove individual products below, or choose{' '}
                    <strong>"Delete Everything (Cascade)"</strong> to remove this {typeLabel.toLowerCase()} and
                    clean up all its products at once. (Products with order history will be safely archived to protect order records).
                  </p>
                </div>
              </div>

              {/* Subcategories list (if category) */}
              {isCategory && subcategories.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Linked Subcategories ({subcategories.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-150">
                    {subcategories.map((sub) => (
                      <span
                        key={sub._id}
                        className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Products list */}
              {products.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Assigned Products ({products.length})</span>
                    </div>
                    <span className="text-[11px] font-normal text-gray-400">
                      Click trash icon to delete individual product
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto">
                    {products.map((prod) => (
                      <div
                        key={prod._id}
                        className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {prod.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                            <span className="font-mono">SKU: {prod.sku}</span>
                            <span>•</span>
                            <span>₹{(prod.basePrice / 100).toLocaleString('en-IN')}</span>
                            <span>•</span>
                            {prod.hasOrders ? (
                              <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded">
                                Has Orders
                              </span>
                            ) : (
                              <span className="text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                No Orders
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSingleProduct(prod._id, prod.title)}
                          disabled={deletingProductId === prod._id}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete this product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          {!hasDependencies ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDirectDelete}
              isLoading={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" /> Delete {typeLabel}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCascadeDelete}
              isLoading={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" /> Delete Everything ({products.length} Products & {typeLabel})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeleteImpactModal;