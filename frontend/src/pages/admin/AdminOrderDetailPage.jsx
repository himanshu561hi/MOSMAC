import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  CreditCard,
  Banknote,
  FileText,
  DollarSign,
  ShieldAlert,
  PackageCheck
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  fetchAdminOrderDetail,
  updateAdminOrderStatus,
  processAdminRefund
} from '@/store/slices/orderSlice';
import OrderDocumentModal from '@/components/orders/OrderDocumentModal';

// Strict State Transition Map matching backend orderService.js
const ALLOWED_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: []
};

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const {
    adminCurrentOrder: order,
    adminLoading,
    adminError,
    adminUpdatingStatus,
    adminProcessingRefund
  } = useSelector((state) => state.orders);

  // Status Update Form State
  const [nextStatus, setNextStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [statusError, setStatusError] = useState('');

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmountRupees, setRefundAmountRupees] = useState('');
  const [refundReason, setRefundReason] = useState('Customer requested order return');
  const [refundSuccess, setRefundSuccess] = useState('');
  const [refundError, setRefundError] = useState('');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('invoice');

  useEffect(() => {
    if (id) {
      dispatch(fetchAdminOrderDetail(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (order) {
      const allowed = ALLOWED_TRANSITIONS[order.orderStatus] || [];
      setNextStatus(allowed[0] || '');
      setCarrier(order.tracking?.carrier || '');
      setTrackingNumber(order.tracking?.trackingNumber || '');
      setTrackingUrl(order.tracking?.trackingUrl || '');
    }
  }, [order]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setStatusSuccess('');
    setStatusError('');

    if (!nextStatus) {
      setStatusError('Select a valid transition status');
      return;
    }

    try {
      await dispatch(
        updateAdminOrderStatus({
          id: order._id,
          orderStatus: nextStatus,
          notes: statusNotes,
          carrier: carrier.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined
        })
      ).unwrap();

      setStatusSuccess(`Order status successfully updated to ${nextStatus.toUpperCase()}`);
      setStatusNotes('');
    } catch (err) {
      setStatusError(err || 'Failed to update order status');
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    setRefundSuccess('');
    setRefundError('');

    const rupees = parseFloat(refundAmountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setRefundError('Enter a valid refund amount in Rupees');
      return;
    }

    const amountInPaise = Math.round(rupees * 100);
    const maxRefundablePaise = (order.grandTotal || 0) - (order.totalRefundedAmount || 0);

    if (amountInPaise > maxRefundablePaise) {
      setRefundError(
        `Amount exceeds maximum refundable balance of ${formatCurrency(maxRefundablePaise)}`
      );
      return;
    }

    try {
      await dispatch(
        processAdminRefund({
          id: order._id,
          amount: amountInPaise,
          reason: refundReason
        })
      ).unwrap();

      setRefundSuccess(`Refund of ₹${rupees.toFixed(2)} processed successfully`);
      setShowRefundModal(false);
      setRefundAmountRupees('');
    } catch (err) {
      setRefundError(err || 'Failed to process refund');
    }
  };

  if (adminLoading && !order) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (adminError || !order) {
    return (
      <div className="p-8 text-center text-sm text-rose-600 bg-rose-50 m-6 rounded-2xl">
        {adminError || 'Order not found'}
      </div>
    );
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[order.orderStatus] || [];
  const maxRefundable = (order.grandTotal || 0) - (order.totalRefundedAmount || 0);
  const canRefund = order.paymentStatus === 'captured' || order.paymentStatus === 'partially_refunded';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            to="/admin/orders"
            className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1.5 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {order.orderNumber}
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-800">
              {order.orderStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {formatDate(order.createdAt)} • Idempotency:{' '}
            <span className="font-mono">{order.idempotencyKey || 'None'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDocType('invoice');
              setDocModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Print Tax Invoice</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDocType('packing_slip');
              setDocModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
          >
            <PackageCheck className="w-4 h-4 text-blue-600" />
            <span>Packing Slip & Proof</span>
          </Button>

          {canRefund && maxRefundable > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRefundAmountRupees((maxRefundable / 100).toFixed(2));
                setShowRefundModal(true);
              }}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 text-purple-600" />
              <span>Process Refund</span>
            </Button>
          )}
        </div>
      </div>

      {statusSuccess && (
        <Alert variant="success" dismissible onClose={() => setStatusSuccess('')}>
          {statusSuccess}
        </Alert>
      )}

      {statusError && (
        <Alert variant="error" dismissible onClose={() => setStatusError('')}>
          {statusError}
        </Alert>
      )}

      {refundSuccess && (
        <Alert variant="success" dismissible onClose={() => setRefundSuccess('')}>
          {refundSuccess}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Operations Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status Transition Control Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Fulfilment State Machine</span>
            </h2>

            {allowedTransitions.length > 0 ? (
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Next Allowed Status *
                    </label>
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
                    >
                      {allowedTransitions.map((st) => (
                        <option key={st} value={st}>
                          {st.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Internal / Audit Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dispatched via Bluedart air express"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Show tracking inputs if updating to shipped or already shipped */}
                {(nextStatus === 'shipped' || order.orderStatus === 'shipped') && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Logistics & Courier Consignment</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Carrier Partner
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Bluedart, Delhivery"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          AWB / Tracking Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 12847592837"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tracking URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://track.courier.com/..."
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" size="sm" disabled={adminUpdatingStatus}>
                    {adminUpdatingStatus ? 'Updating Status...' : `Advance to ${nextStatus.toUpperCase()}`}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                This order has reached a terminal state (<strong>{order.orderStatus}</strong>) and cannot transition further.
              </div>
            )}
          </div>

          {/* Ordered Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Snapshot of Line Items ({order.items?.length || 0})
            </h2>
            <div className="divide-y divide-slate-100">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-400 font-mono">
                        SKU: {item.sku} • Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Financials */}
        <div className="lg:col-span-4 space-y-6">
          {/* Financial Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              Financial Summary
            </h2>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-900">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount ({order.appliedCoupon?.code}):</span>
                <span>- {formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping Fee:</span>
              <span>{order.shippingFee === 0 ? 'FREE' : formatCurrency(order.shippingFee)}</span>
            </div>
            {order.taxBreakdown && (
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>GST Tax (Included):</span>
                <span>{formatCurrency(order.taxBreakdown.totalTax || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-100">
              <span>Grand Total:</span>
              <span>{formatCurrency(order.grandTotal)}</span>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-bold text-slate-800 capitalize">
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Online'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold text-emerald-700 capitalize">{order.paymentStatus}</span>
              </div>
              {order.totalRefundedAmount > 0 && (
                <div className="flex justify-between text-purple-700 font-bold pt-1">
                  <span>Refunded:</span>
                  <span>{formatCurrency(order.totalRefundedAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Customer & Shipping Details
            </h2>
            {order.shippingAddress && (
              <div className="space-y-1 text-slate-600">
                <p className="font-bold text-slate-900">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                {order.shippingAddress.landmark && <p>Near: {order.shippingAddress.landmark}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                  <strong className="text-slate-900">{order.shippingAddress.postalCode}</strong>
                </p>
                <p className="pt-1 font-medium text-slate-800">📞 +91 {order.shippingAddress.phone}</p>
                {order.shippingAddress.email && (
                  <p className="text-slate-500">✉️ {order.shippingAddress.email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Process Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Process Gateway Refund</h3>
                <p className="text-xs text-slate-500">Order #{order.orderNumber}</p>
              </div>
            </div>

            {refundError && <Alert variant="error">{refundError}</Alert>}

            <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex justify-between text-purple-900 font-medium">
                <span>Maximum Refundable:</span>
                <span className="font-bold">{formatCurrency(maxRefundable)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Refund Amount in INR (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={(maxRefundable / 100).toFixed(2)}
                  value={refundAmountRupees}
                  onChange={(e) => setRefundAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Refund *</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Return received, defective item, customer cancellation"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={adminProcessingRefund}
                  onClick={() => setShowRefundModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={adminProcessingRefund}>
                  {adminProcessingRefund ? 'Processing...' : 'Execute Refund via Gateway'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GST Tax Invoice & Packing Slip Modal */}
      <OrderDocumentModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        order={order}
        initialDocType={docType}
      />
    </div>
  );
}

export default AdminOrderDetailPage;
