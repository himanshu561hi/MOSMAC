import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Banknote,
  ArrowRight,
  Copy,
  Check,
  Calendar,
  FileText
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { fetchOrderDetail } from '@/store/slices/orderSlice';
import { fetchCart } from '@/store/slices/cartSlice';

export function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  const { currentOrder, loadingDetail, detailError } = useSelector((state) => state.orders);
  const [copied, setCopied] = useState(false);

  // Use passed state order if available, else fetch from backend
  const order = location.state?.order || currentOrder;

  useEffect(() => {
    // Refresh cart in Redux so header cart count clears
    dispatch(fetchCart());

    if (!location.state?.order && orderNumber) {
      dispatch(fetchOrderDetail(orderNumber));
    }
  }, [dispatch, location.state?.order, orderNumber]);

  const handleCopyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loadingDetail && !order) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (detailError && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">{detailError}</p>
        <Link to="/products">
          <Button variant="primary">Return to Store</Button>
        </Link>
      </div>
    );
  }

  // Delivery estimation: 4 business days ahead
  const estimatedDate = new Date(order?.createdAt || Date.now());
  estimatedDate.setDate(estimatedDate.getDate() + 4);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Success Celebration Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Order Confirmed
        </span>
        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mt-3">
          Thank you for your order!
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2 max-w-lg mx-auto">
          We have received your order and our fulfilment center is preparing it for dispatch.
        </p>

        {/* Order Number Pill */}
        <div className="mt-5 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
          <span className="text-xs text-gray-500 font-medium">Order Reference:</span>
          <span className="text-sm font-extrabold text-gray-900 font-mono tracking-wide">
            {order?.orderNumber || orderNumber}
          </span>
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
            title="Copy Order Number"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Order Details Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-8">
        {/* Delivery ETA & Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-900 font-medium">Estimated Delivery Date</p>
              <p className="text-base font-extrabold text-emerald-950">
                {formatDate(estimatedDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              {order?.orderStatus || 'Confirmed'}
            </span>
          </div>
        </div>

        {/* Ordered Items List */}
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Items Ordered ({order?.items?.length || 0})</span>
          </h2>
          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {order?.items?.map((item, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-400">No img</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      SKU: <span className="font-mono">{item.sku}</span> • Qty: {item.quantity}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatCurrency(item.unitPrice)} each
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Address & Payment Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Delivery Address */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shipping Address</span>
            </h3>
            {order?.shippingAddress ? (
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                {order.shippingAddress.landmark && <p>Near: {order.shippingAddress.landmark}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                  <strong className="text-gray-900">{order.shippingAddress.postalCode}</strong>
                </p>
                <p className="pt-1 font-medium text-gray-700">📞 +91 {order.shippingAddress.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Address on file</p>
            )}
          </div>

          {/* Payment & Billing */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              {order?.paymentMethod === 'cod' ? (
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Payment Details</span>
            </h3>
            <div className="text-xs text-gray-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="font-bold text-gray-900 capitalize">
                  {order?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Online'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span
                  className={`font-bold capitalize ${
                    order?.paymentStatus === 'captured'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {order?.paymentStatus || 'Pending'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 text-gray-900 font-bold">
                <span>Grand Total Paid:</span>
                <span className="text-sm font-extrabold">{formatCurrency(order?.grandTotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
          <Link to="/products" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link to="/track-order" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto flex items-center justify-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>Track Order</span>
              </Button>
            </Link>
            <Link to="/account/orders" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-1.5">
                <span>View Order History</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmationPage;
