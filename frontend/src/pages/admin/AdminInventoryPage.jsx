import React, { useState, useEffect } from 'react';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import { adminService, downloadCsv } from '@/services/adminService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';
import {
  Boxes,
  Search,
  AlertTriangle,
  ArrowUpDown,
  History,
  CheckCircle,
  XCircle,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Package,
  Download
} from 'lucide-react';

export function AdminInventoryPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Adjust Stock Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('restock');
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Audit Logs Modal State
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedSkuForLogs, setSelectedSkuForLogs] = useState('');
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchInventory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15
      };
      if (search.trim()) params.search = search.trim();
      if (lowStockOnly) params.lowStock = 'true';

      const res = await adminCatalogueService.getInventory(params);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory overview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, lowStockOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setDelta(0);
    setReason('restock');
    setReferenceId('');
    setNote('');
    setAdjustError('');
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');
    const deltaNum = parseInt(delta, 10);

    if (isNaN(deltaNum) || deltaNum === 0) {
      setAdjustError('Please enter a non-zero adjustment amount (positive for additions, negative for deductions).');
      return;
    }

    if (selectedItem.stockQuantity + deltaNum < 0) {
      setAdjustError(`Cannot deduct ${Math.abs(deltaNum)} units: current stock is only ${selectedItem.stockQuantity}. Stock cannot drop below 0.`);
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await adminCatalogueService.adjustStock({
        sku: selectedItem.sku,
        delta: deltaNum,
        reason,
        referenceId: referenceId.trim() || undefined,
        note: note.trim() || `Manual inventory adjustment via Admin Portal`
      });

      setSuccessMsg(`Stock for SKU '${selectedItem.sku}' adjusted by ${deltaNum > 0 ? `+${deltaNum}` : deltaNum} units.`);
      setAdjustModalOpen(false);
      fetchInventory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setAdjustError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const openLogsModal = async (sku) => {
    setSelectedSkuForLogs(sku);
    setLogsModalOpen(true);
    setIsLoadingLogs(true);
    try {
      const res = await adminCatalogueService.getInventoryLogs({ sku, limit: 30 });
      setLogs(res.logs);
      setLogsPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Quick stats
  const totalTracked = pagination.total || 0;
  const lowStockCount = items.filter((i) => i.availableStock <= i.lowStockThreshold).length;
  const totalUnits = items.reduce((acc, i) => acc + (i.availableStock || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            Inventory & Stock Engine
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time SKU stock levels, atomic adjustments with negative-stock prevention, and immutable audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <BulkActionButtons
            module="inventory"
            moduleTitle="Inventory"
            onSuccess={() => {
              fetchInventory();
              setSuccessMsg('Bulk inventory adjustments completed successfully.');
            }}
          />

          <Button
            variant="secondary"
            onClick={fetchInventory}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tracked SKUs</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalTracked}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock SKUs</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Units (Page)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{totalUnits}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
      {successMsg && <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU or product title..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
          />
          Show Low Stock & Out-of-Stock Only
        </label>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500">Loading stock inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No inventory records found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {search || lowStockOnly
                ? 'No items matched your search or low-stock filter.'
                : 'Products created in the catalogue will display their SKU stock levels here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">SKU / Identifier</th>
                  <th className="py-3 px-4">Product & Variant</th>
                  <th className="py-3 px-4 text-center">On-Hand Stock</th>
                  <th className="py-3 px-4 text-center">Reserved</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">Threshold</th>
                  <th className="py-3 px-4">Health Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isOutOfStock = item.availableStock <= 0;
                  const isLowStock = !isOutOfStock && item.availableStock <= item.lowStockThreshold;

                  return (
                    <tr key={item.sku} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {item.sku}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{item.productTitle}</div>
                        <div className="text-xs text-gray-500">{item.variantTitle}</div>
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-gray-900">
                        {item.stockQuantity}
                      </td>

                      <td className="py-3 px-4 text-center text-amber-600 font-medium">
                        {item.reservedStock || 0}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold text-base ${
                            isOutOfStock
                              ? 'text-red-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.availableStock}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-gray-400 text-xs">
                        {item.lowStockThreshold} units
                      </td>

                      <td className="py-3 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAdjustModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => openLogsModal(item.sku)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View Movement Audit Logs"
                          >
                            <History className="w-4 h-4" />
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
              <span className="font-semibold text-gray-900">{pagination.totalPages}</span> ({pagination.total} SKUs)
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

      {/* Adjust Stock Modal */}
      {adjustModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-emerald-600" />
                Adjust SKU Stock
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">SKU:</span>
                <span className="font-mono font-bold text-gray-900">{selectedItem.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product:</span>
                <span className="font-medium text-gray-800">{selectedItem.productTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current On-Hand Stock:</span>
                <span className="font-bold text-gray-900">{selectedItem.stockQuantity} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reserved for Pending Orders:</span>
                <span className="font-medium text-amber-600">{selectedItem.reservedStock} units</span>
              </div>
            </div>

            {adjustError && <Alert variant="error" message={adjustError} onClose={() => setAdjustError('')} />}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Adjustment Units (+ / -) *
                </label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. +20 to restock, or -2 for damage"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  New stock will be:{' '}
                  <span className="font-bold text-gray-900">
                    {selectedItem.stockQuantity + (parseInt(delta, 10) || 0)} units
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="restock">Restock (Warehouse Inflow)</option>
                  <option value="correction">Inventory Correction (Count reconciliation)</option>
                  <option value="damaged">Damaged / Expired stock removal</option>
                  <option value="return">Customer Return</option>
                  <option value="audit">Physical Audit Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. PO-8491, AUDIT-NOV-26"
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Audit Log Note
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason for manual adjustment..."
                  className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingAdjust}>
                  {isSubmittingAdjust ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Adjusting...
                    </div>
                  ) : (
                    'Confirm Adjustment'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Audit Logs Modal */}
      {logsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  Inventory Audit Trail: {selectedSkuForLogs}
                </h3>
                <p className="text-xs text-gray-500">
                  Immutable chronological ledger of all stock mutations for this SKU.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLogsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                &times;
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <LoadingSpinner size="md" />
                <p className="text-xs text-gray-400">Loading audit history...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                No inventory movement records found for this SKU.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 uppercase text-gray-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3 text-center">Delta</th>
                      <th className="py-2.5 px-3 text-center">Stock Change</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Performed By</th>
                      <th className="py-2.5 px-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 whitespace-nowrap text-gray-500 font-mono">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={
                              log.delta > 0
                                ? 'text-emerald-600'
                                : log.delta < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }
                          >
                            {log.delta > 0 ? `+${log.delta}` : log.delta}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-gray-700">
                          {log.previousStock} &rarr; {log.newStock}
                        </td>

                        <td className="py-2.5 px-3 capitalize">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">
                            {log.reason}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-medium text-gray-800">
                            {log.performedBy?.firstName
                              ? `${log.performedBy.firstName} ${log.performedBy.lastName || ''}`
                              : 'System / Order'}
                          </div>
                          {log.performedBy?.role && (
                            <div className="text-[10px] text-gray-400 capitalize">
                              {log.performedBy.role.replace('_', ' ')}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 max-w-xs truncate text-gray-500" title={log.note}>
                          {log.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setLogsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInventoryPage;

