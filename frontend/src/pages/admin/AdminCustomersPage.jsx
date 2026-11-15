import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  Ban,
  Eye,
  Shield,
  Clock,
  IndianRupee,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminService, downloadCsv } from '@/services/adminService';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);

  // Status Modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getCustomers({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter || undefined
      });
      setCustomers(res.customers || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCustomers(1);
  };

  const handleExportCsv = async () => {
    try {
      const csv = await adminService.exportCustomersCsv({
        search: search.trim() || undefined,
        status: statusFilter || undefined
      });
      downloadCsv(csv, `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      alert('Failed to export customers CSV');
    }
  };

  const openStatusModal = (customer, newStatus) => {
    setSelectedCustomer(customer);
    setActionStatus(newStatus);
    setStatusReason('');
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !actionStatus) return;
    try {
      setActionLoading(true);
      await adminService.updateCustomerStatus(selectedCustomer._id, {
        status: actionStatus,
        reason: statusReason
      });
      setSelectedCustomer(null);
      loadCustomers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update customer status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Customer Management & CRM
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            View customer profiles, order history, lifetime spend, and account access status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BulkActionButtons
            module="customers"
            moduleTitle="Customers"
            supportsImport={false}
            supportsExport={true}
          />
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-gray-500 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Lifetime Spend</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    Loading customers data...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Anonymous';
                  return (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{fullName}</div>
                        <div className="text-[11px] text-gray-400">ID: {c._id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{c.email}</div>
                        <div className="text-[11px] text-gray-500">{c.phone || 'No phone'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {c.totalOrders || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatCurrency(c.totalSpent || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            c.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'suspended'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <Link
                          to={`/admin/customers/${c._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Profile
                        </Link>
                        {c.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => openStatusModal(c, 'suspended')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Ban className="w-3 h-3" /> Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openStatusModal(c, 'active')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {customers.length} of {pagination.total} customers (Page {pagination.page} of {pagination.pages})
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadCustomers(pagination.page - 1)}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages}
              onClick={() => loadCustomers(pagination.page + 1)}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Account Status Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-sm">
                Confirm Account Status Update
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to change the status of customer{' '}
              <strong>{selectedCustomer.email}</strong> to{' '}
              <strong className="uppercase">{actionStatus}</strong>?
            </p>

            {actionStatus === 'suspended' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Note: Suspending this account will immediately revoke all active JWT tokens and refresh sessions, preventing further authentication until reactivated.
              </p>
            )}

            <form onSubmit={handleConfirmStatusChange} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Audit Log
                </label>
                <textarea
                  rows="2"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Chargeback investigation, suspicious activity, customer request"
                  required
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors ${
                    actionStatus === 'suspended'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionLoading ? 'Updating...' : `Confirm ${actionStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCustomersPage;
