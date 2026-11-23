import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Package,
  Calendar,
  ChevronRight,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CreditCard,
  Banknote
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { fetchCustomerOrders } from '@/store/slices/orderSlice';

const STATUS_TABS = [
  { id: '', label: 'All Orders' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' }
];

export function MyOrdersPage() {
  const dispatch = useDispatch();
  const { orders, total, page, totalPages, loading, error } = useSelector((state) => state.orders);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(
      fetchCustomerOrders({
        page: currentPage,
        limit: 10,
        status: selectedStatus || undefined
      })
    );
  }, [dispatch, currentPage, selectedStatus]);

  const getStatusBadge = (status) => {
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
            <Package className="w-3 h-3" /> Processing
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track, return, or review past purchases and delivery statuses.
          </p>
        </div>
        <Link to="/track-order">
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Track Any Order</span>
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-gray-100">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSelectedStatus(tab.id);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedStatus === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-200/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 rounded-3xl border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs hover:shadow-xs transition-shadow"
            >
              {/* Order Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Order:</span>
                    <span className="text-sm font-extrabold text-gray-900 font-mono">
                      {order.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Placed on {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.orderStatus)}
                  <span className="text-sm font-black text-gray-900">
                    {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Items Thumbnails and Summary */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {order.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200/70 overflow-hidden shrink-0 flex items-center justify-center relative group"
                      title={`${item.title} (x${item.quantity})`}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 bg-gray-900/80 text-white text-[9px] font-bold px-1 rounded-sm">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-600 pl-2">
                    <p className="font-bold text-gray-800">
                      {order.items?.[0]?.title}
                      {order.items?.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {order.items?.reduce((sum, it) => sum + it.quantity, 0)} total items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/account/orders/${order.orderNumber}`}>
                    <Button variant="secondary" size="sm" className="flex items-center gap-1 text-xs">
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Order Card Footer */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  {order.paymentMethod === 'cod' ? (
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'} •{' '}
                    <strong className="capitalize">{order.paymentStatus}</strong>
                  </span>
                </div>
                {order.tracking?.trackingNumber && (
                  <p className="text-emerald-700 font-semibold">
                    Tracking: {order.tracking.carrier} #{order.tracking.trackingNumber}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t border-gray-100 text-xs text-gray-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <Pagination
                totalPages={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Orders Found</h2>
          <p className="text-xs text-gray-500 mb-6">
            You haven't placed any orders matching this filter yet.
          </p>
          <Link to="/products">
            <Button variant="primary">Start Shopping</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default MyOrdersPage;
