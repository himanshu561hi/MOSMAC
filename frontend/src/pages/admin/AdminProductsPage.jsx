import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/utils/formatters';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  Star,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export function AdminProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Load Categories & Brands for filtering dropdowns
  useEffect(() => {
    async function loadAux() {
      try {
        const [cats, brs] = await Promise.all([
          adminCatalogueService.getCategories(false),
          adminCatalogueService.getBrands('')
        ]);
        setCategories(cats);
        setBrands(brs);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    }
    loadAux();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15
      };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const result = await adminCatalogueService.getProducts(params);
      setProducts(result.products);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleToggleStatus = async (product) => {
    const nextStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      await adminCatalogueService.updateProduct(product._id, { status: nextStatus });
      setSuccessMsg(`Product '${product.title}' status changed to ${nextStatus}.`);
      fetchProducts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update product status');
    }
  };

  const handleArchive = async (product) => {
    if (!window.confirm(`Are you sure you want to archive product '${product.title}'? It will no longer appear on the storefront.`)) {
      return;
    }

    try {
      await adminCatalogueService.deleteProduct(product._id);
      setSuccessMsg(`Product '${product.title}' archived successfully.`);
      fetchProducts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to archive product');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Draft
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
            <Archive className="w-3 h-3" /> Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Products & Catalogue
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your single-vendor product catalogue, multi-variant SKUs, pricing (INR paise), and dynamic attributes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <BulkActionButtons
            module="products"
            moduleTitle="Products"
            onSuccess={() => {
              fetchProducts();
              setSuccessMsg('Bulk products import completed successfully.');
            }}
          />
          <Button
            onClick={() => navigate('/admin/products/new')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, SKU, or keywords..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <Button type="submit" variant="secondary" size="sm" className="whitespace-nowrap">
              Apply Filter
            </Button>
          </div>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No products found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {search || categoryFilter || statusFilter
                ? 'No products matched your filter criteria.'
                : 'Get started by creating your first product in the catalogue.'}
            </p>
            <div className="mt-4">
              <Button onClick={() => navigate('/admin/products/new')}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Product
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category / Brand</th>
                  <th className="py-3 px-4">Price (Paise / INR)</th>
                  <th className="py-3 px-4">Inventory</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((prod) => {
                  const totalStock = prod.variants?.reduce((acc, v) => acc + (v.stockQuantity || 0), 0) || 0;
                  const primaryImg = prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url;

                  return (
                    <tr key={prod._id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt={prod.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              {prod.title}
                              {prod.isFeatured && (
                                <span title="Featured Product">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">
                              /{prod.slug}
                            </div>
                            {prod.badges && prod.badges.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {prod.badges.map((b, i) => (
                                  <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs">
                          <p className="font-medium text-gray-800">
                            {prod.categoryId?.name || 'Uncategorized'}
                          </p>
                          <p className="text-gray-400 mt-0.5">
                            {prod.brandId?.name || 'No Brand'}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div>
                          <span>{formatCurrency(prod.basePrice)}</span>
                          {prod.variants?.length > 1 && (
                            <span className="text-xs text-gray-400 block font-normal">
                              from {prod.variants.length} variants
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <span
                            className={`font-semibold ${
                              totalStock <= 5 ? 'text-red-600' : 'text-gray-800'
                            }`}
                          >
                            {totalStock} in stock
                          </span>
                          <span className="text-xs text-gray-400 block">
                            {prod.variants?.length || 0} SKU{prod.variants?.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(prod.status)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prod)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                            title={prod.status === 'published' ? 'Unpublish (set to Draft)' : 'Publish to Storefront'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/products/edit/${prod._id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit Product Details & Variants"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(prod)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Archive Product"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <div>
              Showing Page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
              <span className="font-semibold text-gray-900">{pagination.totalPages}</span> ({pagination.total} products)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProductsPage;

