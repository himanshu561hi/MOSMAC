import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { fetchAdminOrders } from '@/store/slices/orderSlice';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminOrdersPage() {
  const dispatch = useDispatch();
  const { adminOrders, adminTotal, adminPage, adminTotalPages, adminLoading, adminError } =
    useSelector((state) => state.orders);

  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadOrders = (page = 1) => {
    dispatch(
      fetchAdminOrders({
        page,
        limit: 15,
        search: search.trim() || undefined,
        orderStatus: orderStatus || undefined,
        paymentStatus: paymentStatus || undefined
      })
    );
  };

  useEffect(() => {
    loadOrders(currentPage);
  }, [dispatch, currentPage, orderStatus, paymentStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadOrders(1);
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <Clock className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            <ShoppingBag className="w-3 h-3" /> Processing
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'captured':
        return (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Pending
          </span>
        );
      case 'refunded':
      case 'partially_refunded':
        return (
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            {status === 'partially_refunded' ? 'Partial Refund' : 'Refunded'}
          </span>
        );
      case 'failed':
        return (
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Failed
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders & Fulfilment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer orders, update tracking numbers, and process refunds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BulkActionButtons
            module="orders"
            moduleTitle="Orders"
            supportsImport={false}
            supportsExport={true}
          />
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <span>Total Orders:</span>
            <span className="text-emerald-700 font-extrabold">{adminTotal}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search order #, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Filter
          </Button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Fulfilment:</span>
          </div>
          <select
            value={orderStatus}
            onChange={(e) => {
              setOrderStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Payment:</span>
          </div>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="">All Payments</option>
            <option value="captured">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {adminLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : adminError ? (
          <div className="p-8 text-center text-sm text-rose-600 bg-rose-50">
            {adminError}
          </div>
        ) : adminOrders && adminOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {adminOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{ord.shippingAddress?.fullName || 'Guest'}</p>
                      <p className="text-[11px] text-slate-400">
                        {ord.customerSnapshot?.email || ord.shippingAddress?.phone}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(ord.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {ord.items?.length || 0} items
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(ord.grandTotal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        {getPaymentStatusBadge(ord.paymentStatus)}
                        <p className="text-[10px] text-slate-400 capitalize">
                          {ord.paymentMethod === 'cod' ? 'COD' : 'Razorpay'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getOrderStatusBadge(ord.orderStatus)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/admin/orders/${ord._id}`}>
                        <Button variant="secondary" size="xs" className="flex items-center gap-1 inline-flex">
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>Manage</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            No orders found matching your filters.
          </div>
        )}

        {/* Pagination Footer */}
        {adminTotalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {adminPage} of {adminTotalPages} ({adminTotal} total orders)
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={currentPage >= adminTotalPages}
                onClick={() => setCurrentPage((p) => Math.min(adminTotalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrdersPage;
