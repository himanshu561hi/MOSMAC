import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  FileText
} from 'lucide-react';
import Button from '@/components/common/Button';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { fetchOrderDetail, cancelCustomerOrder } from '@/store/slices/orderSlice';

const TIMELINE_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', desc: 'Order details verified' },
  { key: 'processing', label: 'Fulfilment Processing', desc: 'Packing at warehouse' },
  { key: 'shipped', label: 'Shipped', desc: 'Handed over to courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Package handed to recipient' }
];

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const dispatch = useDispatch();

  const { currentOrder, loadingDetail, detailError, cancellingOrder, cancelError } = useSelector(
    (state) => state.orders
  );

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Found a better price elsewhere');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (orderNumber) {
      dispatch(fetchOrderDetail(orderNumber));
    }
  }, [dispatch, orderNumber]);

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        cancelCustomerOrder({
          orderNumber,
          reason: cancelReason
        })
      ).unwrap();
      setShowCancelModal(false);
      setActionSuccess('Your order has been cancelled successfully.');
    } catch (err) {
      // cancelError handled by slice
    }
  };

  if (loadingDetail && !currentOrder) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">{detailError}</p>
        <Link to="/account/orders">
          <Button variant="primary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  if (!currentOrder) return null;

  const isCancelled = currentOrder.orderStatus === 'cancelled';
  const canCancel = ['pending', 'confirmed'].includes(currentOrder.orderStatus);

  const getCurrentStepIndex = () => {
    if (isCancelled) return -1;
    switch (currentOrder.orderStatus) {
      case 'confirmed':
        return 0;
      case 'processing':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/account/orders"
            className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1.5 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
              {currentOrder.orderNumber}
            </h1>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                isCancelled
                  ? 'bg-rose-100 text-rose-700'
                  : currentOrder.orderStatus === 'delivered'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {currentOrder.orderStatus}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Placed on {formatDate(currentOrder.createdAt)}
          </p>
        </div>

        {canCancel && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowCancelModal(true)}
            className="self-start sm:self-auto"
          >
            Cancel Order
          </Button>
        )}
      </div>

      {actionSuccess && (
        <Alert variant="success" className="mb-6" dismissible onClose={() => setActionSuccess('')}>
          {actionSuccess}
        </Alert>
      )}

      {/* Order Status Timeline / Stepper */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-2xs mb-8">
        <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-6">
          Order Status Timeline
        </h2>

        {isCancelled ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">This order was cancelled</p>
              <p className="text-xs text-rose-600 mt-0.5">
                Reason: {currentOrder.cancellation?.reason || 'Cancelled by customer'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2 relative">
            {TIMELINE_STEPS.map((step, idx) => {
              const isPastOrCurrent = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.key} className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isPastOrCurrent
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isPastOrCurrent ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-emerald-700' : isPastOrCurrent ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-gray-400 hidden sm:block">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Courier Tracking Box */}
        {currentOrder.tracking?.trackingNumber && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  Carrier: {currentOrder.tracking.carrier || 'Express Logistics'}
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  Waybill / AWB: {currentOrder.tracking.trackingNumber}
                </p>
              </div>
            </div>
            {currentOrder.tracking.trackingUrl && (
              <a
                href={currentOrder.tracking.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>Live Courier Tracking</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items Snapshot */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Items in this Order ({currentOrder.items?.length || 0})</span>
            </h2>

            <div className="divide-y divide-gray-100">
              {currentOrder.items?.map((item, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        SKU: {item.sku} • Qty: {item.quantity}
                      </p>
                      {item.productSlug && (
                        <Link
                          to={`/product/${item.productSlug}`}
                          className="text-[11px] text-emerald-600 hover:underline font-semibold"
                        >
                          View Product
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                    </p>
                    <p className="text-[11px] text-gray-400">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Billing Address Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Delivery Address</span>
              </h3>
              {currentOrder.shippingAddress && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="font-bold text-gray-900">{currentOrder.shippingAddress.fullName}</p>
                  <p>{currentOrder.shippingAddress.street}</p>
                  {currentOrder.shippingAddress.landmark && <p>Near: {currentOrder.shippingAddress.landmark}</p>}
                  <p>
                    {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.state} -{' '}
                    <strong className="text-gray-900">{currentOrder.shippingAddress.postalCode}</strong>
                  </p>
                  <p className="pt-1 text-gray-700 font-medium">📞 +91 {currentOrder.shippingAddress.phone}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Billing Address</span>
              </h3>
              {currentOrder.billingAddress && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="font-bold text-gray-900">{currentOrder.billingAddress.fullName}</p>
                  <p>{currentOrder.billingAddress.street}</p>
                  <p>
                    {currentOrder.billingAddress.city}, {currentOrder.billingAddress.state} -{' '}
                    <strong className="text-gray-900">{currentOrder.billingAddress.postalCode}</strong>
                  </p>
                  <p className="pt-1 text-gray-700 font-medium">📞 +91 {currentOrder.billingAddress.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
              Payment & Price Breakdown
            </h2>

            <div className="space-y-2.5 text-xs text-gray-600 border-b border-gray-100 pb-4">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-gray-900">{formatCurrency(currentOrder.subtotal)}</span>
              </div>

              {currentOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({currentOrder.appliedCoupon?.code})</span>
                  <span>- {formatCurrency(currentOrder.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping Charges</span>
                <span>
                  {currentOrder.shippingFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatCurrency(currentOrder.shippingFee)
                  )}
                </span>
              </div>

              {currentOrder.taxBreakdown && (
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Estimated GST (Inclusive)</span>
                  <span>{formatCurrency(currentOrder.taxBreakdown.totalTax || 0)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <div>
                <p className="text-xs font-bold text-gray-900">Grand Total</p>
                <p className="text-[10px] text-gray-400">All Taxes Included</p>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(currentOrder.grandTotal)}
              </p>
            </div>

            {/* Payment Method Badge */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Payment Channel:</span>
                <span className="font-bold text-gray-900 capitalize flex items-center gap-1.5">
                  {currentOrder.paymentMethod === 'cod' ? (
                    <Banknote className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  )}
                  {currentOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span
                  className={`font-bold capitalize ${
                    currentOrder.paymentStatus === 'captured'
                      ? 'text-emerald-700'
                      : currentOrder.paymentStatus === 'refunded'
                      ? 'text-purple-700'
                      : 'text-amber-700'
                  }`}
                >
                  {currentOrder.paymentStatus}
                </span>
              </div>
              {currentOrder.totalRefundedAmount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-purple-700 font-bold">
                  <span>Refunded Amount:</span>
                  <span>{formatCurrency(currentOrder.totalRefundedAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Order #{orderNumber}?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to cancel this order? Once cancelled, reserved inventory will be released and payment will be refunded if captured.
              </p>
            </div>

            {cancelError && <Alert variant="error">{cancelError}</Alert>}

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Reason for Cancellation
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Need to change shipping address">Need to change shipping address</option>
                  <option value="Delivery lead time is too long">Delivery lead time is too long</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={cancellingOrder}
                  onClick={() => setShowCancelModal(false)}
                >
                  Keep Order
                </Button>
                <Button type="submit" variant="danger" disabled={cancellingOrder}>
                  {cancellingOrder ? 'Cancelling...' : 'Confirm Cancellation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetailPage;
